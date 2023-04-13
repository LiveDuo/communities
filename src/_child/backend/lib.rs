mod state;
mod verify;

use candid::{export_service, CandidType, Deserialize, Principal};

use ic_cdk_macros::*;

use std::borrow::Borrow;
use std::collections::hash_map;
use std::hash::{Hash, Hasher};

use crate::state::{*, STATE};

#[ic_cdk_macros::init]
fn init() {
    ic_certified_assets::init();
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
fn login_message_hex(principal: Principal) -> Vec<u8> {
    let message_prefix = format!("\x19Ethereum Signed Message:\n");
    let message_prefix_encode = hex::encode(&message_prefix);
    let message_prefix_msg =  hex::decode(message_prefix_encode).unwrap();

    let str = format!("SIGN THIS MESSAGE TO LOGIN TO THE INTERNET COMPUTER.\n\nAPP NAME:\nic-communities\n\nPrincipal:\n{}", principal.to_string());
    let str_encode = hex::encode(&str);
    let hex_msg =  hex::decode(str_encode).unwrap();

    let msg_length = format!("{}", hex_msg.len());
    let msg_length_encode = hex::encode(&msg_length);
    let msg_length_hex =  hex::decode(msg_length_encode).unwrap();

    [message_prefix_msg, msg_length_hex, hex_msg].concat()
}
#[update]
fn create_profile(auth: AuthenticationWith) -> Result<Profile, String> {
    let caller = ic_cdk::caller();

    STATE.with(|s| {
        let mut state = s.borrow_mut();

        if state.indexes.active_principal.contains_key(&caller) {
            return  Err("This principal exist".to_owned());
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

        if state.indexes.profile.contains_key(&authentication) {
            let profile_id = state.indexes.profile.get(&authentication).cloned().unwrap();
            let mut profile = state.profiles.get(&profile_id).cloned().unwrap();
            profile.active_principal = caller.clone();

            state.indexes.active_principal.insert(caller.clone(), profile_id);
            state.profiles.insert(profile_id.clone(), profile.clone());

            return Ok(profile);
        }

        let profile_id = uuid(&caller.to_text());

        state.indexes.profile.insert(authentication.to_owned(), profile_id.to_owned());

        state.indexes.active_principal.insert(caller.clone(), profile_id.to_owned());

        ic_cdk::println!("Linked with address {:?}", authentication.to_owned());

        let profile = Profile {
            authentication: authentication,
            name: "".to_owned(),
            description: "".to_owned(),
            active_principal: caller
        };

        state.profiles.insert(profile_id, profile.clone());
        Ok(profile)
    })
}

// #[update]
// fn create_post(title: String, description: String) -> Result<PostSummary, String> {
//     let caller = ic_cdk::caller();

//     STATE.with(|s| {
//         let mut state = s.borrow_mut();

//         if !state.profiles.contains_key(&caller) {
//             return Err("Profile does not exists".to_owned());
//         }

//         let post_id = uuid(&caller.to_text());
//         let post = Post {
//             title,
//             description,
//             timestamp: ic_cdk::api::time(),
//         };

//         state.posts.insert(post_id, post.clone());

//         state.relations.principal_to_post_id.insert(caller, post_id);

//         let address = state.profiles.get(&caller).unwrap().authentication.clone();
//         let post = PostSummary {
//             title: post.title,
//             post_id,
//             description: post.description,
//             timestamp: post.timestamp,
//             replies_count: 0,
//             last_activity: post.timestamp,
//             address,
//         };
//         Ok(post)
//     })
// }

// #[update]
// fn create_reply(post_id: u64, context: String) -> Result<Reply, String> {
//     STATE.with(|s| {
//         let mut state = s.borrow_mut();

//         let caller = ic_cdk::caller();
//         let principal_opt = state.profiles.get(&caller);

//         if principal_opt == None {
//             return Err("Profile does not exist".to_owned());
//         }

//         if !state.posts.contains_key(&post_id) {
//             return Err("Post does not exist".to_owned());
//         }

//         let address = get_address(&principal_opt.unwrap().authentication);

//         let reply = Reply {
//             text: context.to_owned(),
//             timestamp: ic_cdk::api::time(),
//             address,
//         };

//         let reply_id = uuid(&caller.to_text());

//         state.replay.insert(reply_id, reply.clone());

//         state
//             .relations
//             .principal_to_reply_id
//             .insert(caller.clone(), reply_id.clone());

//         state
//             .relations
//             .reply_id_to_post_id
//             .insert(reply_id.clone(), post_id.clone());

//         Ok(reply)
//     })
// }

// #[query]
// fn get_profile_by_user(authentication: Authentication) -> Option<Profile> {
//     STATE.with(|s| {
//         let state = s.borrow();
//         let index_opt = state.indexes.profile.get(&authentication);
//         if index_opt == None {
//             return None; 
//         }
//         state.profiles.get(&index_opt.unwrap()).cloned()
//     })
// }

// #[query]
// fn get_posts() -> Vec<PostSummary> {
//     STATE.with(|s| {
//         let state = &mut s.borrow_mut();

//         state
//             .posts
//             .iter()
//             .map(|(post_id, post)| {
//                 let replies_opt = state.relations.reply_id_to_post_id.backward.get(&post_id);

//                 let replies_count = if replies_opt == None {
//                     0
//                 } else {
//                     replies_opt.borrow().unwrap().len()
//                 };

//                 let last_activity = if replies_opt == None {
//                     0
//                 } else {
//                     let (reply_id, _) = replies_opt.unwrap().last_key_value().unwrap();
//                     state.replay.get(reply_id).unwrap().timestamp
//                 };

//                 let (principal, _) = state
//                     .relations
//                     .principal_to_post_id
//                     .backward
//                     .get(&post_id)
//                     .unwrap()
//                     .first_key_value()
//                     .unwrap();

//                 let address = state.profiles.get(&principal).cloned().unwrap().authentication;

//                 PostSummary {
//                     title: post.title.to_owned(),
//                     post_id: post_id.to_owned(),
//                     description: post.description.to_owned(),
//                     timestamp: post.timestamp,
//                     replies_count: replies_count as u64,
//                     last_activity,
//                     address: address,
//                 }
//             })
//             .collect::<Vec<_>>()
//     })
// }

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

// #[query]
// fn get_post(post_id: u64) -> Result<PostResponse, String> {
//     STATE.with(|s| {
//         let state = s.borrow();
//         let post_opt = state.posts.get(&post_id);
//         if post_opt == None {
//             return Err("This post does not exists".to_owned());
//         }

//         let replies_opt = state.relations.reply_id_to_post_id.backward.get(&post_id);

//         let replies = if replies_opt == None { vec![] } else { replies_opt.unwrap().iter().map(|(reply_id, _)| state.replay.get(reply_id).unwrap().to_owned()).collect::<Vec<_>>()};

//         let post = post_opt.unwrap();

//         let (principal, _) = state
//                     .relations
//                     .principal_to_post_id
//                     .backward
//                     .get(&post_id)
//                     .unwrap()
//                     .first_key_value()
//                     .unwrap();

//     let address = get_address(&state.profiles.get(&principal).unwrap().authentication);

//         let post_result = PostResponse {
//             replies,
//             title: post.title.to_owned(),
//             timestamp: post.timestamp,
//             description: post.description.to_owned(),
//             address
//         };
//         Ok(post_result)
//     })
// }

// #[query]
// fn get_posts_by_user(authentication: Authentication) -> Result<Vec<PostSummary>, String> {
//     STATE.with(|s| {
//         let state = s.borrow();

//         let principal_opt = state.indexes.profile.get(&authentication);
//         if principal_opt == None {
//             return Err("Profile does not exists".to_owned());
//         }

//         let post_ids_opt = state
//             .relations
//             .principal_to_post_id
//             .forward
//             .get(&principal_opt.unwrap());
//         if post_ids_opt == None {
//             return Ok(vec![]);
//         }

//         let user_post = post_ids_opt
//             .unwrap()
//             .iter()
//             .map(|(post_id, _)| {
//                 let post = state.posts.get(&post_id.to_owned()).unwrap();

//                 let replies_opt = state.relations.reply_id_to_post_id.backward.get(&post_id);

//                 let replies_count = if replies_opt == None {
//                     0
//                 } else {
//                     replies_opt.borrow().unwrap().len()
//                 };

//                 let last_activity = if replies_opt == None {
//                     0
//                 } else {
//                     let (reply_id, _) = replies_opt.unwrap().last_key_value().unwrap();
//                     state.replay.get(reply_id).unwrap().timestamp
//                 };

//                 // FIX
//                 let (principal, _) = state
//                     .relations
//                     .principal_to_post_id
//                     .backward
//                     .get(&post_id)
//                     .unwrap()
//                     .first_key_value()
//                     .unwrap();

//                 let address = state.profiles.get(&principal).cloned().unwrap().authentication;


//                 PostSummary {
//                     post_id: post_id.to_owned(),
//                     title: post.title.to_owned(),
//                     description: post.description.to_owned(),
//                     timestamp: post.timestamp.to_owned(),
//                     replies_count: replies_count as u64,
//                     last_activity,
//                     address
//                 }
//             })
//             .collect::<Vec<_>>();
//         Ok(user_post)
//     })
// }

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
