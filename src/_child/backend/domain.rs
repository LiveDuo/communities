
use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, TransformArgs, HttpResponse, TransformContext
};
use ic_cdk::api::canister_balance;
use candid::{CandidType, candid_method};
use std::ops::Sub;

use ic_cdk_timers::TimerId;
use ic_cdk::{update, query};
use serde::{Serialize, Deserialize};
use slotmap::{Key, KeyData};
use serde_bytes::ByteBuf;
use ic_certified_assets::types::StoreArg;
use addr::parse_domain_name;

use crate::STATE;
use crate::upgrade::authorize;
use crate::utils::{ get_content_type, format_number, uuid };

const EXPIRE_TIME: u64 = 2 * 24 * 60 * 60 * 1000 * 1000 * 1000 ; // 2 days
const REGISTRATIONS_URL: &str = "https://icp0.io/registrations";
const INTERVAL_TIME: u64 = 8 * 60 * 60; // 8 hours
const CYCLES_HTTP_REQUEST: u128 = 21_000_000_000;
const SET_UP_DOMAIN_THRESHOLD_CYCLES: u64 = 126_000_000_000; // 126b cycles


#[derive(Serialize, Deserialize, Debug, CandidType, Clone, PartialEq, Eq)]
enum DomainStatus {
    TimerExpired,
    NotStarted,
    PendingOrder,
    PendingChallengeResponse,
    PendingAcmeApproval,
    Available,
    Failed(String),
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Domain {
    start_time: u64,
    domain_name: String,
    last_status: Result<DomainStatus, String>,
    timer_key: u64,
    subdomain: String,
}
fn clear_timer(timer_key: u64) {
    let key = KeyData::from_ffi(timer_key);
    let timer_id = TimerId::from(key);
    ic_cdk_timers::clear_timer(timer_id);
}


#[update]
#[candid_method(update)]
async fn update_registration(domain_name: String) {
    let request_uuid =  STATE.with(|s| uuid(&mut s.borrow_mut()));
    let request_headers = vec![
        HttpHeader { name: "Content-Type".to_string(), value: "application/json".to_string(), },
        HttpHeader { name: "Host".to_string(), value: "icp0.io".to_string(), }, 
        HttpHeader { name: "Idempotency-Key".to_string(), value: format!("UUID-{}", request_uuid) },
    ];

    let body = serde_json::json!({"name": domain_name}).to_string().as_bytes().to_vec();

    let request = CanisterHttpRequestArgument {
        url: REGISTRATIONS_URL.to_string(),
        method: HttpMethod::POST,
        body: Some(body),
        max_response_bytes: None,
        transform: Some(TransformContext::from_name("transform".to_owned(), vec![])),
        headers: request_headers,
    };

    let (response, ) = http_request(request, CYCLES_HTTP_REQUEST).await.map_err(|(code, message)| format!("http error: {}-{:?}", message, code)).unwrap();
    if response.status != candid::Nat::from(200u64) {
        STATE.with(|s| {
            let mut state = s.borrow_mut();
            let domain = state.domain.as_mut().unwrap();
            domain.last_status = Err(String::from_utf8(response.body).unwrap());
            state.domain = Some(domain.to_owned());
        });
        return;
    }

    let registration = serde_json::from_slice::<serde_json::Value>(&response.body).unwrap();
    let request_id = registration["id"].as_str().unwrap().to_owned();

    let request_uuid =  STATE.with(|s| uuid(&mut s.borrow_mut()));
    let request_headers = vec![
        HttpHeader { name: "Host".to_string(), value: "icp0.io".to_string(), }, 
        HttpHeader { name: "Idempotency-Key".to_string(), value: format!("UUID-{}", request_uuid) },
    ];

    let request = CanisterHttpRequestArgument {
        url: format!("{REGISTRATIONS_URL}/{request_id}"),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: None,
        transform: Some(TransformContext::from_name("transform".to_owned(), vec![])),
        headers: request_headers,
    };

    let (response, ) = http_request(request, CYCLES_HTTP_REQUEST).await.map_err(|(code, message)| format!("http error: {}-{:?}", message, code)).unwrap();
    if response.status != candid::Nat::from(200u64) {
        STATE.with(|s| { 
            let mut state = s.borrow_mut();
            let domain = state.domain.as_mut().unwrap();
            domain.last_status = Err(String::from_utf8(response.body).unwrap());
            state.domain = Some(domain.to_owned());
        });
        return;
    }
    
    let registration_status = serde_json::from_slice::<serde_json::Value>(&response.body).unwrap();
    STATE.with(|s| { 
        let mut state = s.borrow_mut();
        let domain = state.domain.as_mut().unwrap();
        domain.last_status = Ok(serde_json::from_value::<DomainStatus>(registration_status["state"].clone()).unwrap());
        state.domain = Some(domain.to_owned());
    });

}

#[update]
#[candid_method(update)]
async fn register_domain(domain_name: String) -> Result<Domain, String> {
    let caller = ic_cdk::caller();
    authorize(&caller).await?;

    let canister_balance = canister_balance();

    if !canister_balance.ge(&SET_UP_DOMAIN_THRESHOLD_CYCLES) {
        return Err(format!("Not enough cycles to upgrade. Top up the canister with {} additional cycles.", format_number(SET_UP_DOMAIN_THRESHOLD_CYCLES.sub(canister_balance))));
    }

    let parse_domain_result = parse_domain_name(&domain_name);
    if parse_domain_result.is_err() {
        return Err("Invalid domain name".to_owned());
    }
    
    let interval = std::time::Duration::from_secs(INTERVAL_TIME);

    let timer_id = ic_cdk_timers::set_timer_interval(interval,  || {
        ic_cdk::println!("set_timer_interval");
        
        STATE.with(|s| {
            let mut state = s.borrow_mut();
            
            if state.domain.is_none() {
                return;
            }

            let mut domain = state.domain.clone().unwrap();


            if domain.last_status == Ok(DomainStatus::Available) {
                clear_timer(domain.timer_key);                
                return;
            }

            if ic_cdk::api::time() > domain.start_time + EXPIRE_TIME {

                domain.last_status = Ok(DomainStatus::TimerExpired);
                state.domain =  Some(domain.to_owned());

                clear_timer(domain.timer_key);
                return;
            }

            ic_cdk::spawn(update_registration(domain.domain_name.to_owned()))
        });
    });
    let parse_domain = parse_domain_result.unwrap();
    let domain_name = if parse_domain.prefix().is_none() { format!("www.{}",parse_domain.as_str()) } else { parse_domain.as_str().to_owned() };
    // store domain file 
    let content = domain_name.to_owned();
    let content = ByteBuf::from(content.as_bytes().to_vec());
    let key = format!("/.well-known/ic-domains");
    let store_args = StoreArg {
      key: key.to_owned(),
      content_type: get_content_type(&key),
      content_encoding: "identity".to_owned(),
      content,
      sha256: None
    };
    ic_certified_assets::store(store_args);
    
    let domain = STATE.with(|s| {
        let mut state = s.borrow_mut();

        if let Some(domain) = &state.domain {
            clear_timer(domain.timer_key);
        }

        let domain = Domain {
            start_time: ic_cdk::api::time(),
            domain_name: domain_name.to_owned(),
            last_status: Ok(DomainStatus::NotStarted),
            timer_key: timer_id.data().as_ffi(),
            subdomain: parse_domain_name(&domain_name).unwrap().prefix().unwrap().to_owned()
        };
        state.domain = Some(domain);
        state.domain.clone()
    });

    Ok(domain.unwrap())
}

#[query]
#[candid_method(query)]
fn get_registration() -> Option<Domain>{
    STATE.with(|s| s.borrow().domain.clone())
}


#[query]
#[candid_method(query)]
fn transform(raw: TransformArgs) -> HttpResponse {

    let headers = vec![
        HttpHeader {
            name: "Content-Security-Policy".to_string(),
            value: "default-src 'self'".to_string(),
        },
        HttpHeader {
            name: "Referrer-Policy".to_string(),
            value: "strict-origin".to_string(),
        },
        HttpHeader {
            name: "Permissions-Policy".to_string(),
            value: "geolocation=(self)".to_string(),
        },
        HttpHeader {
            name: "Strict-Transport-Security".to_string(),
            value: "max-age=63072000".to_string(),
        },
        HttpHeader {
            name: "X-Frame-Options".to_string(),
            value: "DENY".to_string(),
        },
        HttpHeader {
            name: "X-Content-Type-Options".to_string(),
            value: "nosniff".to_string(),
        },
    ];


    let res = HttpResponse {
        status: raw.response.status.clone(),
        body: raw.response.body.clone(),
        headers,
        ..Default::default()
    };

    res
}