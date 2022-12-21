use candid::{CandidType, Deserialize, export_service, Principal};

use std::collections::BTreeMap;
use std::convert::TryInto;
use std::cell::RefCell;

const PAGESIZE: usize = 25;

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
pub struct State { profiles: BTreeMap<Principal, Profile>, wall_posts: Vec<Post>, latest_post_id: i128 }

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
fn get_by_name(name: String) -> Option<Profile> {
    let profile_store = STATE.with(|s| s.borrow_mut().profiles.clone());

    for (_, profile) in profile_store.iter() {
        if profile.name.eq(&name) {
            return Some(profile.clone());
        }
    }

    None
}

#[ic_cdk_macros::query]
fn get_own_profile() -> Profile {
    let principal_id = ic_cdk::caller();
    return STATE.with(|s| {
        let profile_store = &s.borrow().profiles;        
        profile_store
            .get(&principal_id)
            .cloned()
            .unwrap_or_else(|| Profile::default())
    });
}


#[ic_cdk_macros::query]
fn get_own_principal() -> Principal {
    ic_cdk::caller()
}

#[ic_cdk_macros::query]
fn get_principal_by_eth(eth_address: String) -> Option<Principal> {
    let profile_store = STATE.with(|s| s.borrow_mut().profiles.clone());

    for (principal, profile) in profile_store.iter() {
        if profile.address.to_lowercase().eq(&eth_address.to_lowercase()) {
            return Some(*principal);
        }
    }

    None
}

#[ic_cdk_macros::query]
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

#[ic_cdk_macros::query]
fn profiles() -> Vec<Profile> {
    let profile_store = STATE.with(|s| s.borrow_mut().profiles.clone());

    let mut profiles: Vec<Profile> = Vec::new();

    for (_, profile) in profile_store.iter() {
        profiles.push(profile.clone());
    }

    return profiles;
}

#[ic_cdk_macros::update]
pub fn set_name(handle: String) -> Profile {
    let principal = ic_cdk::caller();
    let mut profile = get_own_profile();
    profile.name = handle;

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.profiles.insert(principal, profile.clone());
    });

    return profile;
}

#[ic_cdk_macros::update]
pub fn set_description(description: String) -> Profile {
    let principal = ic_cdk::caller();
    let mut profile = get_own_profile();
    profile.description = description;
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.profiles.insert(principal, profile.clone());
    });
    return profile;
}

#[ic_cdk_macros::update]
pub fn link_address(message: String, signature: String) -> Profile {
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

    let mut profile = get_own_profile();
    profile.address = address.to_lowercase().clone();
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.profiles.insert(principal, profile.clone());
    });

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


#[ic_cdk_macros::query]
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

#[ic_cdk_macros::update]
pub fn write(text: String)  {
    let principal = ic_cdk::caller();
    let latest_post_id = STATE.with(|s| s.borrow().latest_post_id);
    STATE.with(|s| { s.borrow_mut().latest_post_id = latest_post_id + 1; });

    let profile_store = STATE.with(|s| s.borrow().profiles.clone());
    let profile = profile_store
        .get(&principal)
        .cloned()
        .unwrap_or_else(|| Profile::default());
    
    let post = Post {
        id: latest_post_id,
        timestamp: ic_cdk::api::time() as i128,
        principal_id: principal.to_string(),
        user_address: profile.address,
        user_name: profile.name,
        text,
    };

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.wall_posts.push(post);
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
