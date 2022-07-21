use easy_hasher::easy_hasher::raw_keccak256;
use ic_cdk::export::{
    candid::{CandidType, Deserialize},
    Principal,
};
use ic_cdk::export::candid::{candid_method, export_service};
use ic_cdk::println;
use ic_cdk::*;
use ic_cdk_macros::*;
use ic_cdk::api::time;
use libsecp256k1::recover;
use std::{collections::BTreeMap, convert::TryInto};
use std::ops::Add;

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


#[query(name = "getProfileByPrincipal")]
#[candid_method(query, rename = "getProfileByPrincipal")]
fn get_by_principal(principal: Principal) -> Option<&'static Profile> {
    let profile_store = storage::get::<ProfileStore>();

    for (p, profile) in profile_store.iter() {
        if p.eq(&principal) {
            return Some(profile);
        }
    }

    None
}

#[query(name = "getProfileByEth")]
#[candid_method(query, rename = "getProfileByEth")]
fn get_by_eth(eth_address: String) -> Option<&'static Profile> {
    let profile_store = storage::get::<ProfileStore>();

    for (_, profile) in profile_store.iter() {
        if profile.address.eq(&eth_address) {
            return Some(profile);
        }
    }

    None
}

#[query(name = "getProfileByName")]
#[candid_method(query, rename = "getProfileByName")]
fn get_by_name(name: String) -> Option<&'static Profile> {
    let profile_store = storage::get::<ProfileStore>();

    for (_, profile) in profile_store.iter() {
        if profile.name.eq(&name) {
            return Some(profile);
        }
    }

    None
}

#[query(name = "getOwnProfile")]
#[candid_method(query, rename = "getOwnProfile")]
fn get_own_profile() -> Profile {
    let principal_id = ic_cdk::caller();
    let profile_store = storage::get::<ProfileStore>();

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
    let profile_store = storage::get::<ProfileStore>();

    for (principal, profile) in profile_store.iter() {
        if profile.address.to_lowercase().eq(&eth_address.to_lowercase()) {
            return Some(*principal);
        }
    }

    None
}

#[query(name = "search")]
#[candid_method(query, rename = "search")]
fn search(text: String) -> Option<&'static Profile> {
    let text = text.to_lowercase();
    let profile_store = storage::get::<ProfileStore>();

    for (_, profile) in profile_store.iter() {
        if profile.name.to_lowercase().contains(&text) || profile.description.to_lowercase().contains(&text) {
            return Some(profile);
        }
    }

    None
}

#[query(name = "list")]
#[candid_method(query, rename = "list")]
fn list() -> Vec<&'static Profile> {
    let profile_store = storage::get::<ProfileStore>();

    let mut profiles: Vec<&'static Profile> = Vec::new();

    for (_, profile) in profile_store.iter() {
        profiles.push(profile);
    }

    return profiles;
}

fn _save_profile(profile: Profile) -> () {
    let principal_id = ic_cdk::caller();

    let profile_store = storage::get_mut::<ProfileStore>();

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
type WallPreUpgrade = Vec<PostPreUpgrade>;

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

fn paginate(posts: Vec<&Post>, page: usize) -> Vec<&Post> {
    let start_index = posts.len() - ((page - 1) * PAGESIZE) - 1;
    let mut paginated_posts = Vec::new();
    let mut n: usize = 0;
    while n < PAGESIZE && n <= start_index {
        paginated_posts.push(posts[start_index - n]);
        n += 1;
    }
    paginated_posts
}


#[query(name = "wall")]
#[candid_method(query, rename = "wall")]
pub fn wall(filter_principal_id: String, filter_page: i128) -> Vec<&'static Post> {
    let wall_posts = storage::get::<Wall>();

    // PASS 1, filter on principal_id
    let pass1 = match filter_principal_id != "" {
        true => {
            wall_posts
            .iter()
            .filter_map(|p| match p.principal_id == filter_principal_id {
                true => Some(p),
                false => None
            })
            .collect::<Vec<&Post>>()
        },
        false => wall_posts.iter().map(|p| p).collect::<Vec<&Post>>()
    };

    // PASS 2, pagination
    let pass2 = match filter_page != 0 {
        true => {
            let page = filter_page as usize;
            paginate(pass1, page)
        },
        false => pass1.iter().map(|&p| p).collect()
    };
    return pass2;
}

#[update(name = "write")]
#[candid_method(update, rename = "write")]
pub fn write(text: String)  {
    let principal = ic_cdk::caller();
    let principal_id = principal.to_string();
    let latest_post_id = storage::get_mut::<LatestPostId>();
    *latest_post_id = latest_post_id.add(1);

    let profile_store = storage::get::<ProfileStore>();
    let profile = profile_store
        .get(&principal)
        .cloned()
        .unwrap_or_else(|| Profile::default());
    
    let post = Post {
        id: *latest_post_id,
        timestamp: time() as i128,
        principal_id,
        user_address: profile.address,
        user_name: profile.name,
        text,
    };

    let wall = storage::get_mut::<Wall>();
    wall.push(post);
}

#[pre_upgrade]
fn pre_upgrade() {
    let profile_store = storage::get::<ProfileStore>();

    let mut profiles: Vec<(&Principal, &Profile)> = Vec::new();

    for (principal, profile) in profile_store.iter() {
        profiles.push((principal, profile));
    }
    storage::stable_save((profiles,)).unwrap();

    let wall = storage::get::<WallPreUpgrade>();
    storage::stable_save((wall,)).unwrap();
}

#[post_upgrade]
fn post_upgrade() {
    let profile_store = storage::get_mut::<ProfileStore>();

    let res:Result<(Vec<(Principal, Profile)>,), String> = storage::stable_restore();
    match res {
        Ok((old_profiles,)) => {
            for profile in old_profiles {
                profile_store.insert(profile.0, profile.1.clone());
            }
        }
        Err(_) => {}
    }

    let wall = storage::get_mut::<Wall>();
    let latest_post_id = storage::get_mut::<LatestPostId>();

    let res:Result<(Vec<PostPreUpgrade>,), String> = storage::stable_restore();
    match res {
        Ok((old_posts,)) => {
            for old_post in old_posts {
                ic_cdk::println!("Upgrading post");
                *latest_post_id = latest_post_id.add(1);
                wall.push(Post {
                    id: *latest_post_id,
                    timestamp: time() as i128,
                    principal_id: old_post.user.to_string(),
                    user_address: String::from(""),
                    user_name: String::from(""),
                    text: old_post.text
                });
            }
        }
        Err(_) => {}
    }
}

export_service!();

#[ic_cdk_macros::query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
  __export_service()
}
