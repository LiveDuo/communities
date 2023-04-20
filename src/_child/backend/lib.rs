mod state;
mod verify;

use candid::{export_service, CandidType, Deserialize};

use ic_cdk_macros::*;

use std::borrow::Borrow;
use std::collections::hash_map;
use std::hash::{Hash, Hasher};

use crate::state::{*, STATE};

#[ic_cdk_macros::init]
fn init() {
    ic_certified_assets::init();

    STATE.with(|s| {
		let mut state = s.borrow_mut();
		state.parent = Some(ic_cdk::caller());
	});
}

fn uuid(seed: &str) -> u64 {
    let timestamp: u64 = ic_cdk::api::time() * 1000 * 1000;
    let str = format!("{}-{}", seed, timestamp);
    let mut s = hash_map::DefaultHasher::new();
    str.hash(&mut s);
    s.finish()
}

fn get_address(arg: &Authentication) -> String {
    match arg {
        Authentication::Evm(params) => params.address.to_owned(),
        Authentication::Svm(params) => params.address.to_owned(),
        Authentication::Ic(params) => params.principal.to_text(),
    }
}

#[update]
fn create_profile(auth: AuthenticationWith) -> Result<Profile, String> {
    let caller = ic_cdk::caller();

    STATE.with(|s| {
        let mut state = s.borrow_mut();

        if state.profiles.contains_key(&caller) {
            let profile_opt = state.profiles.get(&caller);
            return Ok(profile_opt.unwrap().clone());
        }

        let authentication = match auth {
            AuthenticationWith::Evm(args) => {
                let param = crate::verify::verify_evm(args);
                Authentication::Evm(param)
            }
            AuthenticationWith::Svm(args) => {
                let param = crate::verify::verify_svm(args);
                Authentication::Svm(param)
            }
            AuthenticationWith::Ic => {
                let param = IcParams {
                    principal: caller.clone(),
                };
                Authentication::Ic(param)
            }
        };

        state
            .indexes
            .profile
            .insert(authentication.to_owned(), caller.clone());

        ic_cdk::println!("Linked with address {:?}", authentication.to_owned());

        let profile = Profile {
            authentication: authentication,
            name: "".to_owned(),
            description: "".to_owned(),
        };

        state.profiles.insert(caller, profile.clone());
        Ok(profile)
    })
}

#[update]
fn create_post(title: String, description: String) -> Result<PostSummary, String> {
    let caller = ic_cdk::caller();

    STATE.with(|s| {
        let mut state = s.borrow_mut();

        if !state.profiles.contains_key(&caller) {
            return Err("Profile does not exists".to_owned());
        }

        let post_id = uuid(&caller.to_text());
        let post = Post {
            title,
            description,
            timestamp: ic_cdk::api::time(),
        };

        state.posts.insert(post_id, post.clone());

        state.relations.principal_to_post_id.insert(caller, post_id);

        let address = state.profiles.get(&caller).unwrap().authentication.clone();
        let post = PostSummary {
            title: post.title,
            post_id,
            description: post.description,
            timestamp: post.timestamp,
            replies_count: 0,
            last_activity: post.timestamp,
            address,
        };
        Ok(post)
    })
}

#[update]
fn create_reply(post_id: u64, context: String) -> Result<Reply, String> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();

        let caller = ic_cdk::caller();
        let principal_opt = state.profiles.get(&caller);

        if principal_opt == None {
            return Err("Profile does not exist".to_owned());
        }

        if !state.posts.contains_key(&post_id) {
            return Err("Post does not exist".to_owned());
        }

        let address = get_address(&principal_opt.unwrap().authentication);

        let reply = Reply {
            text: context.to_owned(),
            timestamp: ic_cdk::api::time(),
            address,
        };

        let reply_id = uuid(&caller.to_text());

        state.replay.insert(reply_id, reply.clone());

        state
            .relations
            .principal_to_reply_id
            .insert(caller.clone(), reply_id.clone());

        state
            .relations
            .reply_id_to_post_id
            .insert(reply_id.clone(), post_id.clone());

        Ok(reply)
    })
}

#[query]
fn get_profile_by_user(authentication: Authentication) -> Option<Profile> {
    STATE.with(|s| {
        let state = s.borrow();
        let index_opt = state.indexes.profile.get(&authentication);
        if index_opt == None {
            return None; 
        }
        state.profiles.get(&index_opt.unwrap()).cloned()
    })
}

#[query]
fn get_posts() -> Vec<PostSummary> {
    STATE.with(|s| {
        let state = &mut s.borrow_mut();

        state
            .posts
            .iter()
            .map(|(post_id, post)| {
                let replies_opt = state.relations.reply_id_to_post_id.backward.get(&post_id);

                let replies_count = if replies_opt == None {
                    0
                } else {
                    replies_opt.borrow().unwrap().len()
                };

                let last_activity = if replies_opt == None {
                    0
                } else {
                    let (reply_id, _) = replies_opt.unwrap().last_key_value().unwrap();
                    state.replay.get(reply_id).unwrap().timestamp
                };

                let (principal, _) = state
                    .relations
                    .principal_to_post_id
                    .backward
                    .get(&post_id)
                    .unwrap()
                    .first_key_value()
                    .unwrap();

                let address = state.profiles.get(&principal).cloned().unwrap().authentication;

                PostSummary {
                    title: post.title.to_owned(),
                    post_id: post_id.to_owned(),
                    description: post.description.to_owned(),
                    timestamp: post.timestamp,
                    replies_count: replies_count as u64,
                    last_activity,
                    address: address,
                }
            })
            .collect::<Vec<_>>()
    })
}

#[query]
fn get_profile() -> Result<Profile, String> {
    STATE.with(|s| {
        let state = s.borrow();

        let caller = ic_cdk::caller();
        let profile_opt = state.profiles.get(&caller);
        if profile_opt == None {
            return Err("Profile does not exists".to_owned());
        }

        Ok(profile_opt.unwrap().clone())
    })
}

#[query]
fn get_post(post_id: u64) -> Result<PostResponse, String> {
    STATE.with(|s| {
        let state = s.borrow();
        let post_opt = state.posts.get(&post_id);
        if post_opt == None {
            return Err("This post does not exists".to_owned());
        }

        let replies_opt = state.relations.reply_id_to_post_id.backward.get(&post_id);

        let replies = if replies_opt == None { vec![] } else { replies_opt.unwrap().iter().map(|(reply_id, _)| state.replay.get(reply_id).unwrap().to_owned()).collect::<Vec<_>>()};

        let post = post_opt.unwrap();

        let (principal, _) = state
                    .relations
                    .principal_to_post_id
                    .backward
                    .get(&post_id)
                    .unwrap()
                    .first_key_value()
                    .unwrap();

    let address = get_address(&state.profiles.get(&principal).unwrap().authentication);

        let post_result = PostResponse {
            replies,
            title: post.title.to_owned(),
            timestamp: post.timestamp,
            description: post.description.to_owned(),
            address
        };
        Ok(post_result)
    })
}

#[query]
fn get_posts_by_user(authentication: Authentication) -> Result<Vec<PostSummary>, String> {
    STATE.with(|s| {
        let state = s.borrow();

        let principal_opt = state.indexes.profile.get(&authentication);
        if principal_opt == None {
            return Err("Profile does not exists".to_owned());
        }

        let post_ids_opt = state
            .relations
            .principal_to_post_id
            .forward
            .get(&principal_opt.unwrap());
        if post_ids_opt == None {
            return Ok(vec![]);
        }

        let user_post = post_ids_opt
            .unwrap()
            .iter()
            .map(|(post_id, _)| {
                let post = state.posts.get(&post_id.to_owned()).unwrap();

                let replies_opt = state.relations.reply_id_to_post_id.backward.get(&post_id);

                let replies_count = if replies_opt == None {
                    0
                } else {
                    replies_opt.borrow().unwrap().len()
                };

                let last_activity = if replies_opt == None {
                    0
                } else {
                    let (reply_id, _) = replies_opt.unwrap().last_key_value().unwrap();
                    state.replay.get(reply_id).unwrap().timestamp
                };

                // FIX
                let (principal, _) = state
                    .relations
                    .principal_to_post_id
                    .backward
                    .get(&post_id)
                    .unwrap()
                    .first_key_value()
                    .unwrap();

                let address = state.profiles.get(&principal).cloned().unwrap().authentication;


                PostSummary {
                    post_id: post_id.to_owned(),
                    title: post.title.to_owned(),
                    description: post.description.to_owned(),
                    timestamp: post.timestamp.to_owned(),
                    replies_count: replies_count as u64,
                    last_activity,
                    address
                }
            })
            .collect::<Vec<_>>();
        Ok(user_post)
    })
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
        storage: ic_certified_assets::pre_upgrade(),
    };

    ic_cdk::storage::stable_save((state,)).unwrap();
}

#[ic_cdk_macros::post_upgrade]
fn post_upgrade() {
    let (s_prev,): (StableState,) = ic_cdk::storage::stable_restore().unwrap();

    STATE.with(|s| {
        *s.borrow_mut() = s_prev.state;
    });

    ic_certified_assets::post_upgrade(s_prev.storage);
}

#[ic_cdk_macros::query]
fn http_request(
    req: ic_certified_assets::types::HttpRequest,
) -> ic_certified_assets::types::HttpResponse {
    return ic_certified_assets::http_request_handle(req);
}

export_service!();

#[ic_cdk_macros::query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
    __export_service()
}

use std::time::Duration;

use ic_cdk_main::export::candid::{Principal as PrincipalMain, Encode};
use candid::{ Principal };
use ic_cdk_main::api::call::CallResult;
use ic_certified_assets::state_machine::AssetDetails;
use ic_cdk_main::api::management_canister::main::*;
use ic_certified_assets::rc_bytes::RcBytes;

#[derive(CandidType, Deserialize)]
pub enum InstallMode {
	#[serde(rename = "install")] Install,
	#[serde(rename = "reinstall")] Reinstall,
	#[serde(rename = "upgrade")] Upgrade,
}


#[derive(CandidType, Deserialize)]
pub struct InstallCanisterArgs {
	pub mode: InstallMode,
	pub canister_id: Principal,
	#[serde(with = "serde_bytes")] pub wasm_module: Vec<u8>,
	pub arg: Vec<u8>,
}

#[derive(CandidType, Deserialize)]
pub struct StoreAssetArgs {
	pub key: String,
	pub content_type: String,
	pub content_encoding: String,
	pub content: Vec<u8>,
}

fn get_content_type(name: &str) -> String {
	if name.ends_with(".html") { return "text/html".to_string() }
	else if name.ends_with(".js") { return "text/javascript".to_string() }
	else if name.ends_with(".css") { return "text/css".to_string() } 
	else if name.ends_with(".txt") { return "text/plain".to_string() }
	else if name.ends_with(".md") { return "text/markdown".to_string() }
	else { return "application/octet-stream".to_string() }
}


async fn upgrade_canister_cb(wasm: Vec<u8>) {
    ic_cdk_main::println!("Child: Self upgrading...");

    // upgrade code
    let id = ic_cdk_main::id();
    let install_args = InstallCodeArgument { mode: CanisterInstallMode::Upgrade, canister_id: id, wasm_module: wasm, arg: Encode!().unwrap(), };
    let result: CallResult<()> = ic_cdk_main::api::call::call(PrincipalMain::management_canister(), "install_code", (install_args,),).await;
    result.unwrap();
    ic_cdk_main::print(format!("done"));
    ic_cdk_main::println!("done");
}


async fn store_assets(assets: Vec<AssetDetails>, parent_canister_id: Principal) -> Result<(), String> {
    let canister_id = ic_cdk::id();

	for asset in &assets {
	
		// skip unnecessary files
		if !asset.key.starts_with("/child") || asset.key == "/child/child.wasm" { continue; }

		// get asset content
        let (asset_bytes, ): (RcBytes, ) = ic_cdk::call(parent_canister_id, "retrieve", (asset.key.to_string(),),).await.map_err(|(code, msg)| format!("Update settings: {}: {}", code as u8, msg)).unwrap();

		let content;
		if asset.key == "/child/static/js/bundle.js" {
			let bundle_str = String::from_utf8(asset_bytes.to_vec()).expect("Invalid JS bundle");
			let bundle_with_env = bundle_str.replace("REACT_APP_CHILD_CANISTER_ID", &canister_id.to_string());
			content = bundle_with_env.as_bytes().to_vec();
		} else {
			content = asset_bytes.to_vec();
		}

		// upload asset
		let key = asset.key.replace("/child", "");
		let content_type = get_content_type(&key);
		let content_encoding = "identity".to_owned();

		let store_args = StoreAssetArgs { key: key.to_string(), content_type, content_encoding, content, };
		let result: Result<((),), _> = ic_cdk::api::call::call(canister_id, "store", (store_args,),).await;
		match result {
			Ok(_) => {},
			Err((code, msg)) => return Err(format!("Upload asset error: {}: {}", code as u8, msg))
		}
    }

	Ok(())
}


#[ic_cdk_macros::update]
async fn upgrade_canister() {

    let parent_opt = STATE.with(|s| { s.borrow().parent });
    if parent_opt == None { return; }
    
    let parent = Principal::from_text(parent_opt.unwrap().to_text()).unwrap(); // FIX
    let (asset_list, ): (Vec<AssetDetails>, ) = ic_cdk::call(parent, "list", (),).await.map_err(|(code, msg)| format!("Update settings: {}: {}", code as u8, msg)).unwrap();
    store_assets(asset_list,parent).await.unwrap();
    

    let wasm_key = "/child/child.wasm".to_owned();
    let wasm_bytes: (RcBytes, ) = ic_cdk::call(parent, "retrieve", (wasm_key,),).await.map_err(|(code, msg)| format!("Update settings: {}: {}", code as u8, msg)).unwrap();
    let wasm = wasm_bytes.0.as_ref().to_vec();

    ic_cdk_main::timer::set_timer(Duration::from_millis(2000), || ic_cdk_main::spawn(upgrade_canister_cb(wasm)));
}   
