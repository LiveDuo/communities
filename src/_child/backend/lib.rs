mod state;
mod verify;

use candid::{export_service, CandidType, Deserialize, Principal};

use sha2::{Sha256, Digest};
use ic_cdk_macros::*;

use std::borrow::Borrow;
use std::collections::hash_map;
use std::hash::{Hash, Hasher};

use crate::state::{*, STATE};

#[ic_cdk_macros::init]
fn init(wasm_hash: Option<Vec<u8>>) {
    ic_certified_assets::init();

    STATE.with(|s| {
		let mut state = s.borrow_mut();
		state.parent = Some(ic_cdk::caller());
        state.wasm_hash = wasm_hash;
	});
}

fn uuid(seed: &str) -> u64 {
    let timestamp: u64 = ic_cdk::api::time() * 1000 * 1000;
    let str = format!("{}-{}", seed, timestamp);
    let mut s = hash_map::DefaultHasher::new();
    str.hash(&mut s);
    s.finish()
}


fn get_authentication_with_address(authentication: &Authentication, caller: &Principal) -> AuthenticationWithAddress {
    match authentication {
        Authentication::Evm(params) => AuthenticationWithAddress::Evm(params.to_owned()),
        Authentication::Svm(params) => AuthenticationWithAddress::Svm(params.to_owned()),
        Authentication::Ic => {
            let params = IcParams {principal: caller.to_owned()};
            AuthenticationWithAddress::Ic(params)
        },
    }
}

fn login_message(principal: &Principal) -> String {
    format!("Sign this message to login.\n\nApp:\ncommunities.ooo\n\nAddress:\n{}\n\n", principal.to_string())
}

fn login_message_hex_evm(principal: &Principal) -> String {
    let message_prefix = format!("\x19Ethereum Signed Message:\n");
    let message_prefix_encode = hex::encode(&message_prefix);
    let message_prefix_msg =  hex::decode(message_prefix_encode).unwrap();

    let str = login_message(&principal);
    let str_encode = hex::encode(&str);
    let hex_msg =  hex::decode(str_encode).unwrap();

    let msg_length = format!("{}", hex_msg.len());
    let msg_length_encode = hex::encode(&msg_length);
    let msg_length_hex =  hex::decode(msg_length_encode).unwrap();

    let msg_vec = [message_prefix_msg, msg_length_hex, hex_msg].concat();

    easy_hasher::easy_hasher::raw_keccak256(msg_vec).to_hex_string()

}

fn login_message_hex_svm(principal: &Principal) -> String {
    let msg = login_message(&principal);
    hex::encode(&msg)
}

#[update]
fn create_profile(auth: AuthenticationWith) -> Result<Profile, String> {
    let caller = ic_cdk::caller();

    STATE.with(|s| {
        let mut state = s.borrow_mut();


        let authentication_profile = match auth {
            AuthenticationWith::Evm(args) => {
                if args.message.trim_start_matches("0x") != login_message_hex_evm(&caller) {
                    return Err("Principal does not match".to_owned());
                }

                let param = crate::verify::verify_evm(args);
                Authentication::Evm(param)
            }
            AuthenticationWith::Svm(args) => {
                if args.message != login_message_hex_svm(&caller) {
                    return Err("Principal does not match".to_owned());
                }

                let param = crate::verify::verify_svm(args);
                Authentication::Svm(param)
            }
            AuthenticationWith::Ic => Authentication::Ic
        };

        let authentication_with_address = get_authentication_with_address(&authentication_profile, &caller);

        if state.indexes.profile.contains_key(&authentication_with_address) {
            let profile_id = state.indexes.profile.get(&authentication_with_address).cloned().unwrap();
            let mut profile = state.profiles.get(&profile_id).cloned().unwrap();

            if Authentication::Ic != authentication_profile {
                profile.active_principal = caller.clone();
                state.indexes.active_principal.insert(caller.clone(), profile_id);
                state.profiles.insert(profile_id.clone(), profile.clone());
            }

            return Ok(profile);
        }

        let profile_id = uuid(&caller.to_text());

        state.indexes.profile.insert(authentication_with_address.to_owned(), profile_id.to_owned());

        state.indexes.active_principal.insert(caller.clone(), profile_id.to_owned());

        ic_cdk::println!("Linked with address {:?}", authentication_profile.to_owned());

        let profile = Profile {
            authentication: authentication_profile,
            name: "".to_owned(),
            description: "".to_owned(),
            active_principal: caller
        };

        state.profiles.insert(profile_id, profile.clone());
        Ok(profile)
    })
}

#[update]
fn create_post(title: String, description: String) -> Result<PostSummary, String> {
    let caller = ic_cdk::caller();

    STATE.with(|s| {
        let mut state = s.borrow_mut();

        let profile_id_opt = state.indexes.active_principal.get(&caller);

        if profile_id_opt == None {
            return Err("Profile does not exists".to_owned());
        }
        let profile_id = profile_id_opt.cloned().unwrap();

        let post_id = uuid(&caller.to_text());

        let post = Post {
            title,
            description,
            timestamp: ic_cdk::api::time(),
        };

        state.posts.insert(post_id, post.clone());

        state.relations.profile_id_to_post_id.insert(profile_id, post_id);

        let profile = state.profiles.get(&profile_id).unwrap();

        let authentication = get_authentication_with_address( &profile.authentication, &profile.active_principal);
        let post = PostSummary {
            title: post.title,
            post_id,
            description: post.description,
            timestamp: post.timestamp,
            replies_count: 0,
            last_activity: post.timestamp,
            authentication,
        };
        Ok(post)
    })
}

#[update]
fn create_reply(post_id: u64, context: String) -> Result<ReplyResponse, String> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();

        let caller = ic_cdk::caller();

        if !state.indexes.active_principal.contains_key(&caller){
            return Err("Profile does not exist".to_owned());
        }

        if !state.posts.contains_key(&post_id) {
            return Err("Post does not exist".to_owned());
        }

        let reply = Reply {
            text: context.to_owned(),
            timestamp: ic_cdk::api::time()
        };

        let profile_id = state.indexes.active_principal.get(&caller).cloned().unwrap();
        
        let reply_id = uuid(&caller.to_text());
        
        state.replies.insert(reply_id, reply.clone());
        
        state.relations.profile_id_to_reply_id.insert(profile_id.clone(), reply_id.clone());
        
        state.relations.reply_id_to_post_id.insert(reply_id.clone(), post_id.clone());
        
        let profile = state.profiles.get(&profile_id).unwrap();
        let authentication = get_authentication_with_address(&profile.authentication, &profile.active_principal);

        let reply_response =  ReplyResponse {
            text: reply.text,
            timestamp: reply.timestamp,
            authentication
        };

        Ok(reply_response)
    })
}

#[query]
fn get_profile_by_user(authentication: Authentication) -> Option<Profile> {
    STATE.with(|s| {
        let state = s.borrow();
        let caller = ic_cdk::caller();
        let auth = get_authentication_with_address(&authentication, &caller);
        let index_opt = state.indexes.profile.get(&auth);
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
                    state.replies.get(reply_id).unwrap().timestamp
                };

                let (profile_id, _) = state.relations.profile_id_to_post_id.backward.get(&post_id).unwrap().first_key_value().unwrap();

                let profile =  state.profiles.get(&profile_id).unwrap();

                let authentication = get_authentication_with_address(&profile.authentication, &profile.active_principal);

                PostSummary {
                    title: post.title.to_owned(),
                    post_id: post_id.to_owned(),
                    description: post.description.to_owned(),
                    timestamp: post.timestamp,
                    replies_count: replies_count as u64,
                    last_activity,
                    authentication,
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
        let profile_id_opt = state.indexes.active_principal.get(&caller);
        if profile_id_opt == None {
            return Err("Profile does not exists".to_owned());
        }
        let profile = state.profiles.get(profile_id_opt.unwrap()).unwrap();
        Ok(profile.clone())
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

        let replies = if replies_opt == None {
            vec![]
        } else {
             replies_opt.unwrap().iter().map(|(reply_id, _)| {
                let reply = state.replies.get(reply_id).unwrap();
                let (profile_id, _) = state.relations.profile_id_to_reply_id.backward.get(reply_id).unwrap().first_key_value().unwrap();
                let profile = state.profiles.get(&profile_id).unwrap();
                let authentication  = get_authentication_with_address(&profile.authentication, &profile.active_principal);
                ReplyResponse { text: reply.text.to_owned(), timestamp: reply.timestamp, authentication }
            }).collect::<Vec<_>>()
        };

        let post = post_opt.unwrap();

        let (profile_id, _) = state.relations.profile_id_to_post_id.backward.get(&post_id).unwrap().first_key_value().unwrap();

        let profile = state.profiles.get(&profile_id).unwrap();
        let authentication  = get_authentication_with_address(&profile.authentication, &profile.active_principal);

        let post_result = PostResponse {
            replies,
            title: post.title.to_owned(),
            timestamp: post.timestamp,
            description: post.description.to_owned(),
            authentication
        };
        Ok(post_result)
    })
}

#[query]
fn get_posts_by_user(authentication: Authentication) -> Result<Vec<PostSummary>, String> {
    STATE.with(|s| {
        let state = s.borrow();

        let caller = ic_cdk::caller();
        let auth = get_authentication_with_address(&authentication, &caller);

        let profile_id_opt = state.indexes.profile.get(&auth);
        if profile_id_opt == None {
            return Err("Profile does not exists".to_owned());
        }

        let post_ids_opt = state
            .relations
            .profile_id_to_post_id
            .forward
            .get(&profile_id_opt.unwrap());

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
                    state.replies.get(reply_id).unwrap().timestamp
                };

                // FIX
                let (profile_id, _) = state
                    .relations
                    .profile_id_to_post_id
                    .backward
                    .get(&post_id)
                    .unwrap()
                    .first_key_value()
                    .unwrap();

                let profile = state.profiles.get(&profile_id).unwrap();
                let authentication = get_authentication_with_address(&profile.authentication, &profile.active_principal);

                PostSummary {
                    post_id: post_id.to_owned(),
                    title: post.title.to_owned(),
                    description: post.description.to_owned(),
                    timestamp: post.timestamp.to_owned(),
                    replies_count: replies_count as u64,
                    last_activity,
                    authentication
                }
            })
            .collect::<Vec<_>>();
        Ok(user_post)
    })
}


#[update]
fn test_fn() {
    ic_cdk::println!("hello from test fn");
    ic_cdk::println!("hello from test fn");
    ic_cdk::println!("hello from test fn");
    ic_cdk::println!("hello from test fn");
    ic_cdk::println!("hello from test fn");
    ic_cdk::println!("hello from test fn");
    ic_cdk::println!("hello from test fn");
}

fn update_wasm_hash() {
    let wasm_bytes = ic_certified_assets::get_asset("/temp/child.wasm".to_owned());
    let mut hasher = Sha256::new();
    hasher.update(wasm_bytes.clone());
    let wasm_hash = hasher.finalize()[..].to_vec();
    STATE.with(|s| s.borrow_mut().wasm_hash = Some(wasm_hash));
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
    // restore state
    let (s_prev,): (StableState,) = ic_cdk::storage::stable_restore().unwrap();
    ic_certified_assets::post_upgrade(s_prev.storage);
    STATE.with(|s| *s.borrow_mut() = s_prev.state);

    // finalize upgrade
    update_wasm_hash();
    replace_assets_from_temp();
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

use ic_cdk_main::export::candid::{Principal as PrincipalMain};
use serde_bytes::ByteBuf;
use ic_cdk_main::api::call::CallResult;
use ic_cdk_main::api::management_canister::main::*;
use ic_certified_assets::rc_bytes::RcBytes;
use ic_certified_assets::types::{StoreArg, DeleteAssetArguments};

#[derive(CandidType, Deserialize)]
pub enum InstallMode {
	#[serde(rename = "install")] Install,
	#[serde(rename = "reinstall")] Reinstall,
	#[serde(rename = "upgrade")] Upgrade,
}

#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq)]
pub struct Upgrade { 
    pub version: String,
    pub upgrade_from: Option<Vec<u8>>,
    pub timestamp: u64,
    pub wasm_hash: Vec<u8>,
    pub assets: Vec<String>
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
    let install_args = InstallCodeArgument { mode: CanisterInstallMode::Upgrade, canister_id: id, wasm_module: wasm, arg: vec![], };
    let result: CallResult<()> = ic_cdk_main::api::call::call(PrincipalMain::management_canister(), "install_code", (install_args,),).await;
    result.unwrap();
}

fn replace_assets_from_temp() {
    let assets = ic_certified_assets::list_assets();

    for asset  in  &assets {
        if !asset.key.starts_with("/temp") {
            ic_certified_assets::delete(DeleteAssetArguments { key: asset.key.to_owned() });
        }
    }

    for asset in  &assets {
            // store frontend assets
        if asset.key.starts_with("/temp") {
            let asset_content: Vec<u8> = ic_certified_assets::get_asset(asset.key.to_owned());
            let args_store = StoreArg {
                key: asset.key.replace("/temp", ""),
                content_type: asset.content_type.to_owned(),
                content_encoding: "identity".to_owned(),
                content: ByteBuf::from(asset_content),
                sha256: None
            };
            ic_certified_assets::store_asset(args_store);
            
            ic_certified_assets::delete(DeleteAssetArguments { key: asset.key.to_owned() });
        } 
    }
}


async fn store_assets_to_temp(parent_canister: Principal, assets: &Vec<String>, version: &str) -> Result<(), String> {
    let canister_id = ic_cdk::id();

    for asset in assets {
		
        // get asset content
        let (asset_bytes, ): (RcBytes, ) = ic_cdk::call(parent_canister, "retrieve", (asset.to_owned(),),).await.unwrap();

        // replace env car
		let content;
		if asset == &format!("/upgrade/{}/static/js/bundle.js", version) {
			let bundle_str = String::from_utf8(asset_bytes.to_vec()).expect("Invalid JS bundle");
			let bundle_with_env = bundle_str.replace("REACT_APP_CHILD_CANISTER_ID", &canister_id.to_string());
			content = ByteBuf::from(bundle_with_env.as_bytes().to_vec());
		} else {
			content = ByteBuf::from(asset_bytes.to_vec());
		}

		// upload asset
		let key = asset.replace(&format!("/upgrade/{}", version), "/temp");
        ic_cdk::println!("key {:?}", key);
		let store_args = StoreArg {
            key: key.to_owned(),
            content_type: get_content_type(&key),
            content_encoding: "identity".to_owned(),
            content,
            sha256: None
        };
        ic_certified_assets::store_asset(store_args);
    }

	Ok(())
}

#[ic_cdk_macros::query]
async fn get_next_upgrade() -> Result<Option<Upgrade>, String> {
    let parent_opt = STATE.with(|s| { s.borrow().parent });
    if parent_opt == None { return Err("Parent canister not found".to_owned()); }
    let parent  = parent_opt.unwrap();
    let current_version_opt = STATE.with(|s| s.borrow().wasm_hash.to_owned());
    if current_version_opt == None { return  Err("Current version not found".to_owned()); }
    let current_version = current_version_opt.unwrap();
    
    let (next_version_opt,) = ic_cdk::call::<_, (Option<Upgrade>,)>(parent, "get_next_upgrade", (current_version,),).await.unwrap();
    
    Ok(next_version_opt)
}

async fn authorize(caller: &PrincipalMain) -> Result<(), String>{
	let canister_id = ic_cdk_main::id();
	let args = CanisterIdRecord { canister_id };
	let (canister_status, ) = ic_cdk_main::api::call::call::<_, (CanisterStatusResponse, )>(PrincipalMain::management_canister(), "canister_status", (args,)).await.map_err(|(code, err)| format!("{:?} - {}",code, err)).unwrap();

	if canister_status.settings.controllers.iter().any(|c| c ==  caller) {
		Ok(())
	} else {
		Err(format!("Caller is not a controller"))
	}
}

#[ic_cdk_macros::update]
async fn upgrade_canister(wasm_hash: Vec<u8>) -> Result<(), String> {
    
    let caller = ic_cdk_main::caller();
    authorize(&caller).await?;

    // get parent canister
    let parent_canister_opt = STATE.with(|s| { s.borrow().parent });
    if parent_canister_opt == None { return Err("Parent canister not found".to_owned()); }
    
    // get upgrade from parent
    let parent_canister = parent_canister_opt.unwrap();
    let (upgrade_opt,) = ic_cdk::call::<_, (Option<Upgrade>,)>(parent_canister, "get_upgrade", (wasm_hash, )).await.unwrap();
    if upgrade_opt == None { return Err("Version not found".to_owned()); }
    let upgrade = upgrade_opt.unwrap();

    // store assets to temp
    store_assets_to_temp(parent_canister, &upgrade.assets, &upgrade.version).await.unwrap();

    // upgrade wasm
    let wasm = ic_certified_assets::get_asset("/temp/child.wasm".to_owned());	
    ic_cdk_main::spawn(upgrade_canister_cb(wasm));

    Ok(())
}   
