use candid::{CandidType, Deserialize, export_service, Principal};

use std::collections::HashMap;
use std::convert::TryInto;
use std::cell::RefCell;

#[derive(Clone, Debug, Default, CandidType, Deserialize)]
pub struct Profile {
    pub address: String,
    pub name: String,
    pub description: String,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Post {
    pub id: i128,
    pub timestamp: i128,
    pub principal_id: String,
    pub user_address: String,
    pub user_name: String,
    pub text: String,
}


#[derive(Default)]
pub struct State { profiles: HashMap<Principal, Profile>, posts: Vec<Post> }

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

#[ic_cdk_macros::init]
fn init() {
    ic_certified_assets::init();
}

#[ic_cdk_macros::query]
fn get_profile_by_principal(principal: Principal) -> Option<Profile> {
    let profile_store = STATE.with(|s| s.borrow_mut().profiles.clone());

    for (p, profile) in profile_store.iter() {
        if p.eq(&principal) {
            return Some(profile.clone());
        }
    }

    None
}

#[ic_cdk_macros::query]
fn get_by_eth(eth_address: String) -> Option<Profile> {
    let profile_store = STATE.with(|s| s.borrow_mut().profiles.clone());

    for (_, profile) in profile_store.iter() {
        if profile.address.eq(&eth_address) {
            return Some(profile.clone());
        }
    }

    None
}

#[ic_cdk_macros::query]
fn get_profile() -> Profile {
    let principal_id = ic_cdk::caller();
    return STATE.with(|s| {
        let profile_store = &s.borrow().profiles;        
        profile_store
            .get(&principal_id)
            .cloned()
            .unwrap_or_else(|| Profile::default())
    });
}

#[ic_cdk_macros::update]
pub fn update_profile(name_opt: Option<String>, description_opt: Option<String>) -> Profile {
    let principal = ic_cdk::caller();
    let mut profile = get_profile();

    if let Some(name) = name_opt { profile.name = name; }
    if let Some(description) = description_opt { profile.description = description; }

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.profiles.insert(principal, profile.clone());
    });

    return profile;
}

#[ic_cdk_macros::update]
pub fn update_profile_address(message: String, signature: String) -> Profile {
    let principal = ic_cdk::caller();
    let mut signature_bytes = hex::decode(signature.trim_start_matches("0x")).unwrap();
    let recovery_byte = signature_bytes.pop().expect("No recovery byte");
    let recovery_id = libsecp256k1::RecoveryId::parse_rpc(recovery_byte).unwrap();
    let signature_slice = signature_bytes.as_slice();
    let signature_bytes: [u8; 64] = signature_slice.try_into().unwrap();
    let signature = libsecp256k1::Signature::parse_standard(&signature_bytes).unwrap();
    let message_bytes = hex::decode(message.trim_start_matches("0x")).unwrap();
    let message_bytes: [u8; 32] = message_bytes.try_into().unwrap();
    let message = libsecp256k1::Message::parse(&message_bytes);
    let public_key = libsecp256k1::recover(&message, &signature, &recovery_id).unwrap();
    let public_key_bytes = public_key.serialize();
    let keccak256 = easy_hasher::easy_hasher::raw_keccak256(public_key_bytes[1..].to_vec());
    let keccak256_hex = keccak256.to_hex_string();
    let mut address: String = "0x".to_owned();
    address.push_str(&keccak256_hex[24..]);

    ic_cdk::println!("Linked eth address {:?}", address);

    let mut profile = get_profile();
    profile.address = address.to_lowercase().clone();
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.profiles.insert(principal, profile.clone());
    });

    return profile;
}

#[ic_cdk_macros::query]
pub fn get_posts(_filter_principal_id: String, _filter_page: i128) -> Vec<Post> {
    let posts = STATE.with(|s| s.borrow_mut().posts.clone());
    return posts;
}

#[ic_cdk_macros::update]
pub fn create_post(text: String)  {
    let principal = ic_cdk::caller();
    let posts_len = STATE.with(|s| s.borrow().posts.len());

    let profile_store = STATE.with(|s| s.borrow().profiles.clone());
    let profile = profile_store
        .get(&principal)
        .cloned()
        .unwrap_or_else(|| Profile::default());
    
    let post = Post {
        id: posts_len as i128,
        timestamp: ic_cdk::api::time() as i128,
        principal_id: principal.to_string(),
        user_address: profile.address,
        user_name: profile.name,
        text,
    };

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.posts.push(post);
    });
}

#[ic_cdk_macros::pre_upgrade]
fn pre_upgrade() {}

#[ic_cdk_macros::post_upgrade]
fn post_upgrade() {}

#[ic_cdk_macros::query]
fn http_request(req: ic_certified_assets::types::HttpRequest) -> ic_certified_assets::types::HttpResponse {
    return ic_certified_assets::http_request_handle(req);
}

export_service!();

#[ic_cdk_macros::query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
  __export_service()
}
