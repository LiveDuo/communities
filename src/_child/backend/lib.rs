use candid::{CandidType, Deserialize, export_service, Principal};

use std::collections::HashMap;
use std::convert::TryInto;
use std::cell::RefCell;

#[derive(Clone, Debug, Default, CandidType, Deserialize)]
pub struct Profile {
    pub name: String,
    pub description: String,
    pub address: String,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Reply {
  pub text: String,
  pub timestamp: u64,
  pub address: String,
  pub principal: Principal
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Post {
    pub principal: Principal,
    pub address: String,
    pub title: String,
    pub description: String,
    pub timestamp: u64,
    pub replies: Vec<Reply>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct PostSummary {
  pub title: String,
  pub description: String,
  pub timestamp: u64,
  pub address: String,
  pub replies_count: u64,
  pub last_activity: u64,
}

#[derive(Default, CandidType, Deserialize, Clone)]
pub struct State { profiles: HashMap<Principal, Profile>, address_to_principal: HashMap<String, Principal>, posts: Vec<Post> }

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

#[ic_cdk_macros::init]
fn init() {
    ic_certified_assets::init();
}

#[ic_cdk_macros::query]
fn get_profile_by_address(address: String) -> Option<Profile> {
    STATE.with(|s| {
        let state = s.borrow();
        let principal = state.address_to_principal.get(&address.to_lowercase()).unwrap();
        state.profiles.get(&principal).cloned()
    })
}

#[ic_cdk_macros::query]
fn get_profile() -> Profile {
    let caller = ic_cdk::caller();
    let profile = STATE.with(|s| {
        let profile_store = &s.borrow().profiles;        
        profile_store.get(&caller).cloned().unwrap_or(Profile::default())
    });

    return profile;
}

#[ic_cdk_macros::update]
pub fn update_profile(name_opt: Option<String>, description_opt: Option<String>) -> Profile {
    let principal = ic_cdk::caller();

    let profile = STATE.with(|s| {
        let mut state = s.borrow_mut();

        let profile = state.profiles.get_mut(&principal).unwrap();

        if let Some(name) = name_opt { profile.name = name; }
        if let Some(description) = description_opt { profile.description = description; }

        return profile.clone();
    });

    return profile;
}

#[ic_cdk_macros::update]
pub fn update_profile_address(message: String, signature: String) -> Profile {

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
    let address: String = "0x".to_owned() + &keccak256_hex[24..];

    ic_cdk::println!("Linked eth address {:?}", address);

    let caller = ic_cdk::caller();
    STATE.with(|s| {
        let mut state =  s.borrow_mut();
        let mut profile = state.profiles.get(&caller).cloned().unwrap_or(Profile::default());
        profile.address = address.to_lowercase();

        state.address_to_principal.insert(address.to_lowercase(), caller);
        state.profiles.insert(caller, profile.clone());
        return profile;
    })
}

#[ic_cdk_macros::query]
pub fn get_posts() -> Vec<PostSummary> {
    STATE.with(|s| {

        let state = &mut s.borrow_mut();
        
        state.posts.iter().map(|p| {
            let last_activity = if !p.replies.is_empty() { p.replies.last().unwrap().timestamp } else { 0 };
            PostSummary { title: p.title.clone(), description: p.description.clone(), address: p.address.clone(), timestamp: p.timestamp, replies_count: p.replies.len() as u64, last_activity }
        }).collect::<Vec<PostSummary>>()
    })
}

#[ic_cdk_macros::query]
fn get_post(index: u64) -> Post {
	STATE.with(|s| s.borrow().posts.get(index as usize).unwrap().to_owned())
}

#[ic_cdk_macros::update]
pub fn create_post(title: String, description: String) -> Result<(), String>  {
    let caller = ic_cdk::caller();

    if !is_authorized() { return Err(format!("User not authenticated")) }

    STATE.with(|s| {
        let mut state = s.borrow_mut();

        let post = Post {
            timestamp: ic_cdk::api::time(),
            address: state.profiles.get(&caller).cloned().unwrap().address,
            principal: caller,
            title,
            description,
            replies: vec![]
        };

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.posts.push(post);
    });

    Ok(())
}

fn is_authorized() -> bool {
    let caller = ic_cdk::caller();
    let profile_store = STATE.with(|s| s.borrow().profiles.clone());
    if let None = profile_store.get(&caller) {
        return false;
    } else {
        return true;
    }
}

#[ic_cdk_macros::update]
fn create_reply(index: u64, text: String) -> Result<(), String> {
    
    if !is_authorized() { return Err(format!("User not authenticated")) }

    STATE.with(|s| {
        let caller = ic_cdk::caller();
		let mut state = s.borrow_mut();
        let profile = state.profiles.get(&caller).unwrap();
        let reply = Reply { text, timestamp: ic_cdk::api::time(), address: profile.address.to_owned(), principal: caller };
		state.posts.get_mut(index as usize).unwrap().replies.push(reply);
    });

    Ok(())
}

#[derive(CandidType, Deserialize)]
pub struct StableState {
  pub state: State,
  pub storage: ic_certified_assets::StableState,
}

#[ic_cdk_macros::pre_upgrade]
fn pre_upgrade() {

    let state_pre_upgrade = STATE.with(|s| s.borrow().clone());

    let state = StableState {
        state: state_pre_upgrade,
        storage: ic_certified_assets::pre_upgrade()
    };

    ic_cdk::storage::stable_save((state,)).unwrap();
}

#[ic_cdk_macros::post_upgrade]
fn post_upgrade() {

    let (s_prev,): (StableState,) = ic_cdk::storage::stable_restore().unwrap();

    STATE.with(|s|{
        *s.borrow_mut() = s_prev.state;
    });
    
    ic_certified_assets::post_upgrade(s_prev.storage);
}

#[ic_cdk_macros::query]
fn http_request(req: ic_certified_assets::types::HttpRequest) -> ic_certified_assets::types::HttpResponse {
    return ic_certified_assets::http_request_handle(req);
}

export_service!();

#[ic_cdk_macros::query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
  __export_service()
}
