
use ic_cdk::api::management_canister::http_request::{http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod};
use candid::{CandidType, candid_method};

use ic_cdk_timers::TimerId;
use ic_cdk::{update, query};
use serde::{Serialize, Deserialize};
use slotmap::{Key, KeyData};
use serde_bytes::ByteBuf;
use ic_certified_assets::types::StoreArg;
use addr::parse_domain_name;

use crate::STATE;
use crate::upgrade::authorize;
use crate::utils::get_content_type;

const EXPIRE_TIME: u64 = 1 * 60 * 1000 * 1000 * 1000 ; // 2 mins
const REGISTRATIONS_URL: &str = "https://icp0.io/registrations";
const INTERVAL_TIME: u64 = 30; // 30 sec

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
    domain_name: String,
    subdomain: String,
    timer_key: u64,
    start_time: u64,
    last_status: Result<DomainStatus, String>,
}
fn clear_timer(timer_key: u64) {
    let key = KeyData::from_ffi(timer_key);
    let timer_id = TimerId::from(key);
    ic_cdk_timers::clear_timer(timer_id);
}

#[update]
#[candid_method(update)]
async fn update_registration(domain_name: String) {

    let request_headers = vec![
        HttpHeader { name: "Content-Type".to_string(), value: "application/json".to_string(), },
    ];

    let body = serde_json::json!({"name": domain_name}).to_string().as_bytes().to_vec();

    let request = CanisterHttpRequestArgument {
        url: REGISTRATIONS_URL.to_string(),
        method: HttpMethod::POST,
        body: Some(body),
        max_response_bytes: None,
        transform: None,
        headers: request_headers,
    };

    let (response, ) = http_request(request, 0).await.unwrap();
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

    let request = CanisterHttpRequestArgument {
        url: format!("{REGISTRATIONS_URL}/{request_id}"),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: None,
        transform: None,
        headers: vec![],
    };

    let (response, ) = http_request(request, 0).await.unwrap();
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