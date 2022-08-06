use easy_hasher::easy_hasher::raw_keccak256;
use ic_cdk::export::{
    candid::{CandidType, Deserialize},
    Principal,
};
use ic_cdk::export::candid::{candid_method, export_service};
use ic_cdk::println;
use ic_cdk_macros::*;
use ic_cdk::{api};
use libsecp256k1::recover;
use std::{collections::BTreeMap, convert::TryInto};
use std::cell::RefCell;

use std::{collections::HashMap};

const PAGESIZE: usize = 25;

type ProfileStore = BTreeMap<Principal, Profile>;

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Profile {
    pub address: String,
    pub name: String,
    pub description: String,
}

impl Default for Profile {
    fn default() -> Self {
        Profile {
            address: String::from(""),
            name: String::from(""),
            description: String::from(""),
        }
    }
}

#[derive(Default)]
pub struct State { profiles: ProfileStore, wall_posts: Wall, latest_post_id: LatestPostId }

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

#[init]
fn init() {
    ic_certified_assets::init();
}

#[query(name = "getProfileByPrincipal")]
#[candid_method(query, rename = "getProfileByPrincipal")]
fn get_by_principal(principal: Principal) -> Option<Profile> {
    let profile_store = STATE.with(|s| s.borrow_mut().profiles.clone());

    for (p, profile) in profile_store.iter() {
        if p.eq(&principal) {
            return Some(profile.clone());
        }
    }

    None
}

#[query(name = "getProfileByEth")]
#[candid_method(query, rename = "getProfileByEth")]
fn get_by_eth(eth_address: String) -> Option<Profile> {
    let profile_store = STATE.with(|s| s.borrow_mut().profiles.clone());

    for (_, profile) in profile_store.iter() {
        if profile.address.eq(&eth_address) {
            return Some(profile.clone());
        }
    }

    None
}

#[query(name = "getProfileByName")]
#[candid_method(query, rename = "getProfileByName")]
fn get_by_name(name: String) -> Option<Profile> {
    let profile_store = STATE.with(|s| s.borrow_mut().profiles.clone());

    for (_, profile) in profile_store.iter() {
        if profile.name.eq(&name) {
            return Some(profile.clone());
        }
    }

    None
}

#[query(name = "getOwnProfile")]
#[candid_method(query, rename = "getOwnProfile")]
fn get_own_profile() -> Profile {
    let principal_id = ic_cdk::caller();
    let profile_store = STATE.with(|s| s.borrow_mut().profiles.clone());

    profile_store
        .get(&principal_id)
        .cloned()
        .unwrap_or_else(|| Profile::default())
}


#[query(name = "getOwnPrincipal")]
#[candid_method(query, rename = "getOwnPrincipal")]
fn get_own_principal_id() -> Principal {
    ic_cdk::caller()
}

#[query(name = "getPrincipalByEth")]
#[candid_method(query, rename = "getPrincipalByEth")]
fn get_principal_by_eth(eth_address: String) -> Option<Principal> {
    let profile_store = STATE.with(|s| s.borrow_mut().profiles.clone());

    for (principal, profile) in profile_store.iter() {
        if profile.address.to_lowercase().eq(&eth_address.to_lowercase()) {
            return Some(*principal);
        }
    }

    None
}

#[query(name = "search")]
#[candid_method(query, rename = "search")]
fn search(text: String) -> Option<Profile> {
    let text = text.to_lowercase();
    let profile_store = STATE.with(|s| s.borrow_mut().profiles.clone());

    for (_, profile) in profile_store.iter() {
        if profile.name.to_lowercase().contains(&text) || profile.description.to_lowercase().contains(&text) {
            return Some(profile.clone());
        }
    }

    None
}

#[query(name = "profiles")]
#[candid_method(query, rename = "profiles")]
fn profiles() -> Vec<Profile> {
    let profile_store = STATE.with(|s| s.borrow_mut().profiles.clone());

    let mut profiles: Vec<Profile> = Vec::new();

    for (_, profile) in profile_store.iter() {
        profiles.push(profile.clone());
    }

    return profiles;
}

fn _save_profile(profile: Profile) -> () {
    let principal_id = ic_cdk::caller();

    let mut profile_store = STATE.with(|s| s.borrow_mut().profiles.clone());

    profile_store.insert(principal_id, profile.clone());
}

#[update(name = "setName")]
#[candid_method(update, rename = "setName")]
pub fn set_name(handle: String) -> Profile {
    let mut profile = get_own_profile();
    profile.name = handle;
    _save_profile(profile.clone());
    return profile;
}

#[update(name = "setDescription")]
#[candid_method(update, rename = "setDescription")]
pub fn set_description(description: String) -> Profile {
    let mut profile = get_own_profile();
    profile.description = description;
    _save_profile(profile.clone());
    return profile;
}

#[update(name = "linkAddress")]
#[candid_method(update, rename = "linkAddress")]
pub fn link_address(message: String, signature: String) -> Profile {
    let mut signature_bytes = hex::decode(signature.trim_start_matches("0x")).unwrap();
    let recovery_byte = signature_bytes.pop().expect("No recovery byte");
    let recovery_id = libsecp256k1::RecoveryId::parse_rpc(recovery_byte).unwrap();
    let signature_slice = signature_bytes.as_slice();
    let signature_bytes: [u8; 64] = signature_slice.try_into().unwrap();
    let signature = libsecp256k1::Signature::parse_standard(&signature_bytes).unwrap();
    let message_bytes = hex::decode(message.trim_start_matches("0x")).unwrap();
    let message_bytes: [u8; 32] = message_bytes.try_into().unwrap();
    let message = libsecp256k1::Message::parse(&message_bytes);
    let key = recover(&message, &signature, &recovery_id).unwrap();
    let key_bytes = key.serialize();
    let keccak256 = raw_keccak256(key_bytes[1..].to_vec());
    let keccak256_hex = keccak256.to_hex_string();
    let mut address: String = "0x".to_owned();
    address.push_str(&keccak256_hex[24..]);

    println!("Linked eth address {:?}", address);

    let mut profile = get_own_profile();
    profile.address = address.to_lowercase().clone();
    _save_profile(profile.clone());

    return profile;
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct PostPreUpgrade {
    pub user: Principal,
    pub text: String,
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
type Wall = Vec<Post>;

type LatestPostId = i128;

fn paginate(posts: Vec<Post>, page: usize) -> Vec<Post> {
    let start_index = posts.len() - ((page - 1) * PAGESIZE) - 1;
    let mut paginated_posts = Vec::new();
    let mut n: usize = 0;
    while n < PAGESIZE && n <= start_index {
        paginated_posts.push(posts[start_index - n].clone());
        n += 1;
    }
    paginated_posts
}


#[query(name = "wall")]
#[candid_method(query, rename = "wall")]
pub fn wall(filter_principal_id: String, filter_page: i128) -> Vec<Post> {
    let wall_posts = STATE.with(|s| s.borrow_mut().wall_posts.clone());

    // PASS 1, filter on principal_id
    let pass1 = match filter_principal_id != "" {
        true => {
            wall_posts
            .iter()
            .filter_map(|p| match p.principal_id == filter_principal_id {
                true => Some(p.clone()),
                false => None
            })
            .collect::<Vec<Post>>()
        },
        false => wall_posts.iter().map(|p| p.clone()).collect::<Vec<Post>>()
    };

    // PASS 2, pagination
    let pass2 = match filter_page != 0 {
        true => {
            let page = filter_page as usize;
            paginate(pass1, page)
        },
        false => pass1
    };
    return pass2;
}

#[update(name = "write")]
#[candid_method(update, rename = "write")]
pub fn write(text: String)  {
    let principal = ic_cdk::caller();
    let principal_id = principal.to_string();

    let latest_post_id = STATE.with(|s| s.borrow().latest_post_id);
    STATE.with(|s| { s.borrow_mut().latest_post_id = latest_post_id + 1; });

    let profile_store = STATE.with(|s| s.borrow().profiles.clone());
    let profile = profile_store
        .get(&principal)
        .cloned()
        .unwrap_or_else(|| Profile::default());
    
    let post = Post {
        id: latest_post_id,
        timestamp: api::time() as i128,
        principal_id,
        user_address: profile.address,
        user_name: profile.name,
        text,
    };

    let mut wall = STATE.with(|s| s.borrow_mut().wall_posts.clone());
    wall.push(post);
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {}

#[export_name = "canister_query http_request"]
fn http_request() {
	// return ic_certified_assets::http_request_handle(req);

    #[derive(CandidType, Deserialize)]
    struct HttpRequest {
        method: String,
        url: String,
        headers: HashMap<String, String>,
        body: Vec<u8>,
    }
    
    #[derive(CandidType)]
    struct HttpResponse {
        status_code: u16,
        headers: HashMap<String, String>,
        body: Vec<u8>,
    }

    let req = api::call::arg_data::<(HttpRequest,)>().0;

    let req_fallback = ic_certified_assets::types::HttpRequest {
        method: req.method,
        url: req.url,
        headers: req.headers.into_iter().collect(),
        body: serde_bytes::ByteBuf::from(req.body)
    };
    ic_certified_assets::http_request_handle(req_fallback);
}

export_service!();

#[ic_cdk_macros::query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
  __export_service()
}
