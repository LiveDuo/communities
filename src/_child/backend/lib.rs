mod state;
mod verify;
mod utils;
mod upgrade;
mod auth;

use candid::{ CandidType, Deserialize, Principal, candid_method};

use ic_cdk_macros::{update, query, init};

use std::borrow::Borrow;

use crate::state::{*, STATE};
use upgrade::{update_metadata, check_canister_cycles_balance, replace_assets_from_temp, authorize, store_assets_to_temp, upgrade_canister_cb};
use upgrade::UpgradeWithTrack;
use utils::{uuid, get_asset};

use auth::{get_authentication_with_address, login_message_hex_svm, login_message_hex_evm};

use candid::{Encode, Decode};

#[init]
#[candid_method(init)]
fn init(admin_opt: Option<Principal>, version_opt: Option<String>, track_opt: Option<String>) {
    ic_certified_assets::init();

    STATE.with(|s| {
        let mut state = s.borrow_mut();
		state.parent = Some(ic_cdk::caller());
        state.version = version_opt;
        state.track = track_opt;
	});
    
    if let Some(admin) = admin_opt { 
        let admin_id = create_profile_by_principal(&admin);
        add_profile_role(admin_id, UserRole::Admin);
    }
}

fn create_profile_by_principal(principal: &Principal) -> u64 {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let authentication = Authentication::Ic;
        let profile_id  = uuid(&principal.to_text());
        let profile = Profile { name:"".to_owned(), description: "".to_owned(), authentication, active_principal: principal.to_owned() };
        state.profiles.insert(profile_id.to_owned(), profile);
        state.indexes.active_principal.insert(principal.to_owned(), profile_id);
        state.indexes.profile.insert(AuthenticationWithAddress::Ic(IcParams { principal: principal.to_owned() }), profile_id);
        profile_id
    })
}

fn add_profile_role(profile_id: u64, role: UserRole) {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let role_id = uuid(&profile_id.to_string());
        let role = Role{timestamp: ic_cdk::api::time(), role};
        state.roles.insert(role_id.to_owned(), role);
        state.relations.profile_id_to_role_id.insert(profile_id, role_id)
    })
}

#[update]
#[candid_method(update)]
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
#[candid_method(update)]
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
#[candid_method(update)]
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
#[candid_method(query)]
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
#[candid_method(query)]
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
#[candid_method(query)]
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
#[candid_method(query)]
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
#[candid_method(query)]
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

#[query]
#[candid_method(query)]
fn get_metadata() -> Result<Metadata, String> {
    STATE.with(|s| {
        let state = s.borrow();
        if state.version.is_none() {
            return Err("Version not set".to_owned());
        } else if state.track.is_none() {
            return Err("Track not set".to_owned());
        }

        Ok(Metadata{track: state.track.clone().unwrap(), version: state.version.clone().unwrap()})
    })
}
#[query]
#[candid_method(query)]
fn get_user_roles() -> Vec<Role>{
    let caller = ic_cdk::caller();
    STATE.with(|s| {
        let state = s.borrow();
        if let Some(profile_id) =  state.indexes.active_principal.get(&caller) {
            state.relations.profile_id_to_role_id.forward.get(profile_id)
                .unwrap()
                .iter()
                .map(|(role_id, _)| state.roles.get(role_id).unwrap().to_owned())
                .collect::<Vec<_>>()
        } else {
            vec![]
        }
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
    // restore state
    let (s_prev,): (StableState,) = ic_cdk::storage::stable_restore().unwrap();
    ic_certified_assets::post_upgrade(s_prev.storage);
    STATE.with(|s| *s.borrow_mut() = s_prev.state);

    // finalize upgrade
    update_metadata();
    replace_assets_from_temp();
}

#[query]
#[candid_method(query)]
fn http_request(
    req: ic_certified_assets::types::HttpRequest,
) -> ic_certified_assets::types::HttpResponse {
    return ic_certified_assets::http_request_handle(req);
}

#[update]
#[candid_method(update)]
async fn get_next_upgrades() -> Result<Vec<UpgradeWithTrack>, String> {
    let parent_opt = STATE.with(|s| { s.borrow().parent });
    if parent_opt == None { return Err("Parent canister not found".to_owned()); }
    let parent  = parent_opt.unwrap();

    let current_version_opt = STATE.with(|s| s.borrow().version.to_owned());
    if current_version_opt.is_none() { return  Err("Current version not found".to_owned()); }
    let current_version = current_version_opt.unwrap();

    let track_opt = STATE.with(|s| s.borrow().track.to_owned());
    if track_opt.is_none() { return  Err("Current version not found".to_owned()); }
    let track = track_opt.unwrap();

    let payload = candid::Encode!(&(current_version, track)).unwrap();
    let args = ("v1".to_owned(), "get_next_upgrades".to_owned() ,payload,);
    let (res,) = ic_cdk::call::<_, (Result<Vec<u8>, String>,)>(parent, "handle_interface", args,).await.unwrap();
    let next_versions = candid::Decode!(&res.unwrap(), Vec<UpgradeWithTrack>).unwrap();

    Ok(next_versions)
}

#[update]
#[candid_method(update)]
async fn upgrade_canister(version: String, track: String) -> Result<(), String> {
    
    let caller = ic_cdk::caller();
    authorize(&caller).await?;

    // canister_balance
    check_canister_cycles_balance().await?;

    // get parent canister
    let parent_canister_opt = STATE.with(|s| { s.borrow().parent });
    if parent_canister_opt.is_none() { return Err("Parent canister not found".to_owned()); }
    
    // get upgrade from parent
    let parent_canister = parent_canister_opt.unwrap();
    let payload = candid::Encode!(&(version, track)).unwrap();
    let args = ("v1".to_owned(), "get_upgrade".to_owned(), payload);
    let (res,) = ic_cdk::call::<_, (Result<Vec<u8>, String>,)>(parent_canister, "handle_interface", args).await.unwrap();
    let upgrade_opt = candid::Decode!(&res.unwrap(), Option<UpgradeWithTrack>).unwrap();
    if upgrade_opt.is_none() { return Err("Version not found".to_owned()); }
    let upgrade = upgrade_opt.unwrap();

    // store assets to temp
    store_assets_to_temp(parent_canister, &upgrade.assets, &upgrade.version, &upgrade.track).await.unwrap();

    // upgrade wasm
    let wasm = get_asset("/temp/child.wasm".to_owned());
    upgrade_canister_cb(wasm);

    Ok(())
}

#[test]
fn candid_interface_compatibility() {
    use candid::utils::{service_compatible, CandidSource};
    use std::path::PathBuf;

    ic_cdk::export::candid::export_service!();
    let new_interface = __export_service();

    let old_interface = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("child.did");

    service_compatible(
        CandidSource::Text(&new_interface),
        CandidSource::File(old_interface.as_path()),
    ).expect("The assets canister interface is not compatible with the child.did file");
}
