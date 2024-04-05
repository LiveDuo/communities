mod state;
mod verify;
mod utils;
mod upgrade;
mod auth;
mod icrc7;
mod icrc3;

use candid::{ CandidType, Deserialize, Principal, candid_method};
use ic_cdk::api::management_canister::main::CanisterStatusResponse;

use ic_cdk::api::management_canister::provisional::CanisterIdRecord;
use ic_cdk::{update, query, init, pre_upgrade, post_upgrade};

use crate::icrc7::Icrc7Token;
use crate::icrc3::{log_transaction, TransactionType};
use icrc_ledger_types::icrc::generic_metadata_value::MetadataValue;
use crate::state::{*, STATE};
use upgrade::{update_metadata, check_canister_cycles_balance, replace_assets_from_temp, authorize, store_assets_to_temp, upgrade_canister_cb};
use upgrade::UpgradeWithTrack;
use utils::{uuid, get_asset, get_user_roles, default_account};
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
        add_icrc7_token(&admin)
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

fn add_icrc7_token(principal: &Principal) {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let token_id = uuid(&principal.to_text()) as u128;
        let admin_account = default_account(&principal);
        let minter_account = default_account(&ic_cdk::caller());
        let token_name = format!("{}", token_id);
        let token = Icrc7Token::new(token_id, token_name.to_owned(), None, None, admin_account);
        state.tokens.insert(token_id, token);
        let tx_type = TransactionType::Mint { tid: token_id, from: minter_account, to: admin_account, meta: MetadataValue::Text(token_name) };
        log_transaction(&mut state, tx_type, ic_cdk::api::time(), None);
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
            status: PostStatus::Visible
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
            status: post.status
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
            timestamp: ic_cdk::api::time(),
            status: ReplyStatus::Visible
        };

        let profile_id = state.indexes.active_principal.get(&caller).cloned().unwrap();
        
        let reply_id = uuid(&caller.to_text());
        
        state.replies.insert(reply_id, reply.clone());
        
        state.relations.profile_id_to_reply_id.insert(profile_id.clone(), reply_id.clone());
        
        state.relations.reply_id_to_post_id.insert(reply_id.clone(), post_id.clone());
        
        let profile = state.profiles.get(&profile_id).unwrap();
        let authentication = get_authentication_with_address(&profile.authentication, &profile.active_principal);

        let reply_response = ReplyResponse {
            text: reply.text,
            timestamp: reply.timestamp,
            authentication,
            reply_id: reply_id,
            status: reply.status,
            likes: vec![]
        };

        Ok(reply_response)
    })
}
#[update]
#[candid_method(update)]
fn update_post_status(post_id: u64, status: PostStatus) -> Result<(), String> {
    
    let caller = ic_cdk::caller();
    let caller_roles_opt = get_user_roles(&caller);
    let caller_is_admin = match caller_roles_opt {
        Some(caller_roles) => caller_roles.iter().any(|r| r == &UserRole::Admin),
        None => false
    };

    if !caller_is_admin {
        return Err("Caller is not admin".to_owned())
    }
    
    STATE.with(|s| {
        let mut state = s.borrow_mut();

        let post_opt = state.posts.get_mut(&post_id);
        if post_opt.is_none() {
            return Err("Post does not exist".to_owned());
        }
        let post  = post_opt.unwrap();
        post.status = status;

        Ok(())
    })
}
#[update]
#[candid_method(update)]
fn update_reply_status(reply_id: u64, status: ReplyStatus) -> Result<(), String> {
    let caller = ic_cdk::caller();
    let caller_roles_opt = get_user_roles(&caller);
    let caller_is_admin = match caller_roles_opt {
        Some(caller_roles) => caller_roles.iter().any(|r| r == &UserRole::Admin),
        None => false
    };

    if !caller_is_admin {
        return Err("Caller is not admin".to_owned())
    }
    
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let reply_opt = state.replies.get_mut(&reply_id);
        if reply_opt.is_none() {
            return Err("Post does not exist".to_owned());
        }
        let reply = reply_opt.unwrap(); 
        reply.status = status;

        Ok(())
    })
}

#[query]
#[candid_method(query)]
fn get_profile_by_auth(authentication: AuthenticationWithAddress) -> Option<ProfileResponse> {
    STATE.with(|s| {
        let state = s.borrow();
        let profile_id_opt = state.indexes.profile.get(&authentication);
        if profile_id_opt == None {
            return None; 
        }
        let profile  = state.profiles.get(&profile_id_opt.unwrap()).unwrap();
        let user_roles = get_user_roles(&profile.active_principal).unwrap();
        Some(ProfileResponse {
            name: profile.name.to_owned(),
            description: profile.description.to_owned(),
            authentication: profile.authentication.to_owned(),
            active_principal: profile.active_principal.to_owned(),
            roles: user_roles
        })
    })
}

#[update]
#[candid_method(update)]
fn like_post(post_id: u64) -> Result<u64, String> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        // check profile and post
        let caller = ic_cdk::caller();
        if !state.indexes.active_principal.contains_key(&caller) {
            return Err("Profile does not exist".to_owned());
        }
        if !state.posts.contains_key(&post_id) {
            return Err("Post does not exist".to_owned());
        }
        // check already liked
        let profile_id = state.indexes.active_principal.get(&caller).unwrap().to_owned();
        if state.indexes.has_liked_post.contains_key(&(profile_id.to_owned(), post_id.to_owned())) {
            return Err("Liked already".to_owned());
        }
        // insert like
        let liked_post_id = uuid(&caller.to_text());
        let liked_post = LikedPost {timestamp: ic_cdk::api::time() };
        state.liked_posts.insert(liked_post_id.to_owned(), liked_post);
        state.relations.post_id_to_liked_post_id.insert(post_id, liked_post_id.to_owned());
        state.relations.profile_id_to_liked_post_id.insert(profile_id, liked_post_id.to_owned());
        state.indexes.has_liked_post.insert((profile_id.to_owned(), post_id.to_owned()), ());

        let profile_ids = state.relations.profile_id_to_post_id.backward.get(&post_id).unwrap().to_owned();
        let (profile_id, _) = profile_ids.first_key_value().unwrap(); 
        let likes = state.relations.post_id_to_liked_post_id.forward.get(&post_id).unwrap().len() as u64;

        let mosts_liked_posts_otp = state.indexes.most_liked_posts.get_mut(profile_id);

        if mosts_liked_posts_otp.is_none() {
            state.indexes.most_liked_posts.insert(profile_id.clone(), vec![(post_id.clone(), 1)]);
        } else {
            let mosts_liked_posts  = mosts_liked_posts_otp.unwrap();
            let mut exists = false;
            
            for (index, (_post_id, _likes)) in  mosts_liked_posts.iter().enumerate() {
                if _post_id == &post_id {
                    if index == 0 {
                        mosts_liked_posts[index] = (*_post_id, _likes +1);
                        exists = true;
                        break;
                    } else if mosts_liked_posts[index - 1].1 < _likes + 1 {
                        let temp = mosts_liked_posts[index - 1];
                        mosts_liked_posts[index - 1] = (*_post_id, _likes + 1);
                        mosts_liked_posts[index] = temp;
                        exists = true;
                        break;
                    } else {
                        mosts_liked_posts[index] = (*_post_id, _likes + 1);
                        exists = true;
                        break;
                    }
                }
            }
            if !exists && mosts_liked_posts.len() > 10 {
                mosts_liked_posts.push((post_id, likes));
            } else if !exists && mosts_liked_posts[mosts_liked_posts.len()- 1].1 < likes {
                let i = mosts_liked_posts.len()- 1;
                mosts_liked_posts[i] = (post_id, likes);
            }
            let result = mosts_liked_posts.to_vec();
            state.indexes.most_liked_posts.insert(profile_id.clone(), result);
        }

        Ok(liked_post_id)
    })
}

#[update]
#[candid_method(update)]
fn unlike_post(liked_post_id: u64) -> Result<(), String> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        // check like
        if !state.liked_posts.contains_key(&liked_post_id) {
            return Err("Like does not exist".to_owned());
        }
        // check profile
        let caller = ic_cdk::caller();
        let profile_ids =  state.relations.profile_id_to_liked_post_id.backward.get(&liked_post_id).unwrap().to_owned();
        let (profile_id, _) = profile_ids.first_key_value().unwrap();
        let caller_profile_id = state.indexes.active_principal.get(&caller).unwrap();
        if profile_id != caller_profile_id {
            return Err("Invalid caller".to_owned());
        }
        // remove like
        let post_ids = state.relations.post_id_to_liked_post_id.backward.get(&liked_post_id).unwrap().to_owned();
        let (post_id, _) = post_ids.first_key_value().unwrap();
        state.relations.post_id_to_liked_post_id.remove(post_id.to_owned(), liked_post_id.to_owned());
        state.relations.profile_id_to_liked_post_id.remove(profile_id.to_owned(), liked_post_id.to_owned());
        state.indexes.has_liked_post.remove(&(profile_id.to_owned(), post_id.to_owned()));
        state.liked_posts.remove(&liked_post_id);
        Ok(())
    })
}

#[update]
#[candid_method(update)]
fn like_reply(reply_id: u64) -> Result<u64, String> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        // check profile and post
        let caller = ic_cdk::caller();
        if !state.indexes.active_principal.contains_key(&caller) {
            return Err("Profile does not exist".to_owned());
        }
        if !state.replies.contains_key(&reply_id) {
            return Err("Reply does not exist".to_owned());
        }
        // check already liked
        let profile_id = state.indexes.active_principal.get(&caller).unwrap().to_owned();
        if state.indexes.has_liked_reply.contains_key(&(profile_id.to_owned(), reply_id.to_owned())) {
            return Err("Liked already".to_owned());
        }
        // insert like 
        let liked_reply_id = uuid(&caller.to_text());
        let liked_reply = LikedReply {timestamp: ic_cdk::api::time() };
        state.liked_replies.insert(liked_reply_id.to_owned(), liked_reply);
        state.relations.reply_id_to_liked_reply_id.insert(reply_id, liked_reply_id.to_owned());
        state.relations.profile_id_to_liked_reply_id.insert(profile_id, liked_reply_id.to_owned());
        state.indexes.has_liked_reply.insert((profile_id.to_owned(), reply_id.to_owned()), ());
        Ok(liked_reply_id)
    })
}

#[update]
#[candid_method(update)]
fn unlike_reply(liked_reply_id: u64) -> Result<(), String> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        // check like
        if !state.liked_replies.contains_key(&liked_reply_id) {
            return Err("Like does not exist".to_owned());
        }
        // check profile
        let caller = ic_cdk::caller();
        let profile_ids =  state.relations.profile_id_to_liked_reply_id.backward.get(&liked_reply_id).unwrap().to_owned();
        let (profile_id, _) = profile_ids.first_key_value().unwrap();
        let caller_profile_id = state.indexes.active_principal.get(&caller).unwrap();
        if profile_id != caller_profile_id {
            return Err("Invalid caller".to_owned());
        }
        // remove like
        let reply_ids = state.relations.reply_id_to_liked_reply_id.backward.get(&liked_reply_id).unwrap().to_owned();
        let (reply_id, _) = reply_ids.first_key_value().unwrap();
        state.relations.reply_id_to_liked_reply_id.remove(reply_id.to_owned(), liked_reply_id.to_owned());
        state.relations.profile_id_to_liked_reply_id.remove(profile_id.to_owned(), liked_reply_id.to_owned());
        state.indexes.has_liked_reply.remove(&(profile_id.to_owned(), reply_id.to_owned()));
        state.liked_replies.remove(&liked_reply_id);
        Ok(())
    })
}
#[query]
#[candid_method(query)]
fn get_posts() -> Vec<PostSummary> {
    let caller = ic_cdk::caller();
    let caller_roles_opt = get_user_roles(&caller);
    let caller_is_admin = match caller_roles_opt {
        Some(caller_roles) => caller_roles.iter().any(|r| r == &UserRole::Admin),
        None => false
    };

    STATE.with(|s| {
        let state = &mut s.borrow_mut();

        state
            .posts
            .iter()
            .filter_map(|(post_id, post)| {
                if !caller_is_admin && post.status == PostStatus::Hidden {
                    return None;
                }
                let replies_opt = state.relations.reply_id_to_post_id.backward.get(&post_id);

                let replies_count = if replies_opt == None {
                    0
                } else {
                    replies_opt.unwrap().iter().filter_map(|(reply_id, _)| { 
                        let reply = state.replies.get(reply_id).unwrap();
                        if reply.status == ReplyStatus::Hidden {
                            return None;
                        } else {
                            return Some(reply_id);
                        }
                    }).collect::<Vec<_>>().len()
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

                Some(PostSummary {
                    title: post.title.to_owned(),
                    post_id: post_id.to_owned(),
                    description: post.description.to_owned(),
                    timestamp: post.timestamp,
                    replies_count: replies_count as u64,
                    last_activity,
                    authentication,
                    status: post.status.to_owned()
                })
            })
            .collect::<Vec<_>>()
    })
}

#[query]
#[candid_method(query)]
fn get_profile() -> Result<ProfileResponse, String> {
    STATE.with(|s| {
        let state = s.borrow();

        let caller = ic_cdk::caller();
        let profile_id_opt = state.indexes.active_principal.get(&caller);
        if profile_id_opt == None {
            return Err("Profile does not exists".to_owned());
        }
        let profile_id = profile_id_opt.unwrap();
        let profile = state.profiles.get(profile_id).unwrap();
        let user_roles = get_user_roles(&caller).unwrap();
        Ok(ProfileResponse {
            name: profile.name.to_owned(),
            description: profile.description.to_owned(),
            authentication: profile.authentication.to_owned(),
            active_principal: profile.active_principal.to_owned(),
            roles: user_roles
        })
    })
}

#[query]
#[candid_method(query)]
fn get_post(post_id: u64) -> Result<PostResponse, String> {
    let caller = ic_cdk::caller();
    let caller_roles_opt = get_user_roles(&caller);
    let caller_is_admin = match caller_roles_opt {
        Some(caller_roles) => caller_roles.iter().any(|r| r == &UserRole::Admin),
        None => false
    };

    STATE.with(|s| {
        let state = s.borrow();
        let post_opt = state.posts.get(&post_id);
        if post_opt == None {
            return Err("This post does not exists".to_owned());
        }

        let post = post_opt.unwrap();
        if !caller_is_admin && post.status == PostStatus::Hidden {
            return Err("This post is hiden".to_owned());
        }

        let replies_opt = state.relations.reply_id_to_post_id.backward.get(&post_id);

        let replies = if replies_opt == None {
            vec![]
        } else {
            replies_opt.unwrap().iter().filter_map(|(reply_id, _)| {
                let reply = state.replies.get(reply_id).unwrap();
                if !caller_is_admin && reply.status == ReplyStatus::Hidden {
                    return None;
                }
                let (profile_id, _) = state.relations.profile_id_to_reply_id.backward.get(reply_id).unwrap().first_key_value().unwrap();
                let profile = state.profiles.get(&profile_id).unwrap();
                let liked_reply_ids_opt = state.relations.reply_id_to_liked_reply_id.forward.get(reply_id);
                let likes = if liked_reply_ids_opt.is_none() {
                    vec![]
                } else {
                    liked_reply_ids_opt.unwrap().iter().map(|(liked_reply_id, _)| {
                        let profile_ids = state.relations.profile_id_to_liked_reply_id.backward.get(liked_reply_id).unwrap().to_owned();
                        let (profile_id, _) = profile_ids.first_key_value().unwrap();
                        let profile = state.profiles.get(profile_id).unwrap();
                        let authentication = get_authentication_with_address(&profile.authentication, &profile.active_principal);
                        (liked_reply_id.to_owned(), authentication)
                    }).collect::<Vec<_>>()
                };

                let authentication = get_authentication_with_address(&profile.authentication, &profile.active_principal);
                Some(ReplyResponse { text: reply.text.to_owned(), timestamp: reply.timestamp, authentication , reply_id: reply_id.to_owned(), status: reply.status.to_owned(), likes: likes })
            }).collect::<Vec<_>>()
        };

        

        let (profile_id, _) = state.relations.profile_id_to_post_id.backward.get(&post_id).unwrap().first_key_value().unwrap();

        let profile = state.profiles.get(&profile_id).unwrap();
        let authentication  = get_authentication_with_address(&profile.authentication, &profile.active_principal);

        let liked_post_ids_opt =  state.relations.post_id_to_liked_post_id.forward.get(&post_id);
        let likes = if liked_post_ids_opt.is_none() {
            vec![]
        } else  {
            liked_post_ids_opt.unwrap().to_owned().iter().map(|(liked_post_id, _)| {
                let profile_ids_opt = state.relations.profile_id_to_liked_post_id.backward.get(liked_post_id).unwrap().to_owned();
                let (profile_id, _) = profile_ids_opt.first_key_value().unwrap();
                let profile = state.profiles.get(profile_id).unwrap();
                let authentication  = get_authentication_with_address(&profile.authentication, &profile.active_principal);
                (liked_post_id.to_owned(), authentication)
            }).collect::<Vec<_>>()
        };

        let post_result = PostResponse {
            replies,
            title: post.title.to_owned(),
            timestamp: post.timestamp,
            description: post.description.to_owned(),
            likes: likes,
            authentication,
            status: post.status.to_owned(),
            post_id: post_id.to_owned()
        };
        Ok(post_result)
    })
}

#[query]
#[candid_method(query)]
fn get_posts_by_auth(authentication: AuthenticationWithAddress) -> Result<Vec<PostSummary>, String> {
    STATE.with(|s| {
        let state = s.borrow();
        let profile_id_opt = state.indexes.profile.get(&authentication);
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

        let profile = state.profiles.get(profile_id_opt.unwrap()).unwrap();
        let caller_roles_opt = get_user_roles(&profile.active_principal);
        let caller_is_admin = match caller_roles_opt {
            Some(caller_roles) => caller_roles.iter().any(|r| r == &UserRole::Admin),
            None => false
        };
    
        let user_post =  post_ids_opt
            .unwrap()
            .iter()
            .filter_map(|(post_id, _)| {
                let post = state.posts.get(&post_id.to_owned()).unwrap();
                if !caller_is_admin && post.status == PostStatus::Hidden {
                    return None;
                }
                let replies_opt = state.relations.reply_id_to_post_id.backward.get(&post_id);

                let replies_count = if replies_opt == None {
                    0
                } else {
                    replies_opt.unwrap().iter().filter_map(|(reply_id, _)| { 
                        let reply = state.replies.get(reply_id).unwrap();
                        if reply.status == ReplyStatus::Hidden {
                            return None;
                        } else {
                            return Some(reply_id);
                        }
                    }).collect::<Vec<_>>().len()
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

                Some(PostSummary {
                    post_id: post_id.to_owned(),
                    title: post.title.to_owned(),
                    description: post.description.to_owned(),
                    timestamp: post.timestamp.to_owned(),
                    replies_count: replies_count as u64,
                    last_activity,
                    authentication,
                    status: post.status.to_owned()
                })
            }).collect::<Vec<_>>();
        Ok(user_post)
    })
}

#[query]
#[candid_method(query)]
fn get_most_liked_posts_mock(authentication: AuthenticationWithAddress) -> Result<Vec<PostResponse>, String> {
    Ok(vec![
        PostResponse {title: "Post".to_owned(), post_id: 0, description: "Post description".to_owned(), authentication: authentication.to_owned(), likes: vec![], timestamp: ic_cdk::api::time(), status: PostStatus::Visible, replies: vec![]},
        PostResponse {title: "Post 1".to_owned(), post_id: 1, description: "Post description".to_owned(), authentication: authentication.to_owned(), likes: vec![], timestamp: ic_cdk::api::time(), status: PostStatus::Visible, replies: vec![]},
        PostResponse {title: "Post 2".to_owned(), post_id: 2, description: "Post description".to_owned(), authentication: authentication.to_owned(), likes: vec![], timestamp: ic_cdk::api::time(), status: PostStatus::Visible, replies: vec![]},
        PostResponse {title: "Post 3".to_owned(), post_id: 3, description: "Post description".to_owned(), authentication: authentication.to_owned(), likes: vec![], timestamp: ic_cdk::api::time(), status: PostStatus::Visible, replies: vec![]},
    ])
}
#[query]
#[candid_method(query)]
fn get_most_liked_posts(authentication: AuthenticationWithAddress) -> Result<Vec<PostResponse>, String> {
    Ok(vec![
        PostResponse {title: "Post".to_owned(), post_id: 0, description: "Post description".to_owned(), authentication: authentication.to_owned(), likes: vec![], timestamp: ic_cdk::api::time(), status: PostStatus::Visible, replies: vec![]},
        PostResponse {title: "Post 1".to_owned(), post_id: 1, description: "Post description".to_owned(), authentication: authentication.to_owned(), likes: vec![], timestamp: ic_cdk::api::time(), status: PostStatus::Visible, replies: vec![]},
        PostResponse {title: "Post 2".to_owned(), post_id: 2, description: "Post description".to_owned(), authentication: authentication.to_owned(), likes: vec![], timestamp: ic_cdk::api::time(), status: PostStatus::Visible, replies: vec![]},
        PostResponse {title: "Post 3".to_owned(), post_id: 3, description: "Post description".to_owned(), authentication: authentication.to_owned(), likes: vec![], timestamp: ic_cdk::api::time(), status: PostStatus::Visible, replies: vec![]},
    ])
}

#[query]
#[candid_method(query)]
fn get_most_liked_replies_mock(authentication: AuthenticationWithAddress) -> Result<Vec<ReplyResponse>, String> {
    Ok(vec![
        ReplyResponse {text: "Reply".to_owned(), timestamp: ic_cdk::api::time(), authentication: authentication.to_owned(), reply_id: 0, likes: vec![], status: ReplyStatus::Visible },
        ReplyResponse {text: "Reply 1".to_owned(), timestamp: ic_cdk::api::time(), authentication: authentication.to_owned(), reply_id: 1, likes: vec![], status: ReplyStatus::Visible },
        ReplyResponse {text: "Reply 2".to_owned(), timestamp: ic_cdk::api::time(), authentication: authentication.to_owned(), reply_id: 2, likes: vec![], status: ReplyStatus::Visible },
        ReplyResponse {text: "Reply 3".to_owned(), timestamp: ic_cdk::api::time(), authentication: authentication.to_owned(), reply_id: 3, likes: vec![], status: ReplyStatus::Visible },
    ])
}
#[query]
#[candid_method(query)]
fn get_most_liked_replies(authentication: AuthenticationWithAddress) -> Result<Vec<ReplyResponse>, String> {
    Ok(vec![
        ReplyResponse {text: "Reply".to_owned(), timestamp: ic_cdk::api::time(), authentication: authentication.to_owned(), reply_id: 0, likes: vec![], status: ReplyStatus::Visible },
        ReplyResponse {text: "Reply 1".to_owned(), timestamp: ic_cdk::api::time(), authentication: authentication.to_owned(), reply_id: 1, likes: vec![], status: ReplyStatus::Visible },
        ReplyResponse {text: "Reply 2".to_owned(), timestamp: ic_cdk::api::time(), authentication: authentication.to_owned(), reply_id: 2, likes: vec![], status: ReplyStatus::Visible },
        ReplyResponse {text: "Reply 3".to_owned(), timestamp: ic_cdk::api::time(), authentication: authentication.to_owned(), reply_id: 3, likes: vec![], status: ReplyStatus::Visible },
    ])
}
#[query]
#[candid_method(query)]
fn get_hidden_posts() -> Result<Vec<PostResponse>, String> {
    STATE.with(|s| {
        let state = s.borrow();

        let caller = ic_cdk::caller();
        let caller_roles_opt = get_user_roles(&caller);
        let caller_is_admin = match caller_roles_opt {
            Some(caller_roles) => caller_roles.iter().any(|r| r == &UserRole::Admin),
            None => false
        };
        if !caller_is_admin {
            return Err("Caller is not admin".to_owned())
        }

        let hidden_post = state.posts
            .iter()
            .filter_map(|(post_id, post)| {
                if post.status == PostStatus::Visible {
                    return None;
                }
                let (profile_id, _) = state.relations.profile_id_to_post_id.backward.get(post_id).unwrap().first_key_value().unwrap();
                let profile = state.profiles.get(profile_id).unwrap();
                let authentication = get_authentication_with_address(&profile.authentication, &profile.active_principal);
                let post_response = PostResponse {
                    title: post.title.to_owned(),
                    post_id: post_id.to_owned(),
                    description: post.description.to_owned(),
                    authentication: authentication,
                    timestamp: post.timestamp.to_owned(),
                    status: post.status.to_owned(),
                    replies: vec![],
                    likes: vec![]
                };
                Some(post_response)
            })
            .collect::<Vec<_>>();
        Ok(hidden_post)
    })
}
#[query]
#[candid_method(query)]
fn get_hidden_replies() -> Result<Vec<(u64,ReplyResponse)>, String> {
    STATE.with(|s| {
        let state = s.borrow();

        let caller = ic_cdk::caller();
        let caller_roles_opt = get_user_roles(&caller);
        let caller_is_admin = match caller_roles_opt {
            Some(caller_roles) => caller_roles.iter().any(|r| r == &UserRole::Admin),
            None => false
        };

        if !caller_is_admin {
            return Err("Caller is not admin".to_owned())
        }

        let hidden_replies = state.replies
            .iter()
            .filter_map(|(reply_id, reply)| {
                if reply.status == ReplyStatus::Visible {
                    return None;
                }
                let (profile_id, _) = state.relations.profile_id_to_reply_id.backward.get(reply_id).unwrap().first_key_value().unwrap();
                let (post_id, _) = state.relations.reply_id_to_post_id.forward.get(reply_id).unwrap().first_key_value().unwrap();
                let profile = state.profiles.get(profile_id).unwrap();
                let authentication = get_authentication_with_address(&profile.authentication, &profile.active_principal);
                let reply_response = ReplyResponse {
                    reply_id: reply_id.to_owned(),
                    text: reply.text.to_owned(),
                    authentication: authentication,
                    timestamp: reply.timestamp.to_owned(),
                    status: reply.status.to_owned(),
                    likes: vec![]
                };
                Some((post_id.to_owned(), reply_response))
            })
            .collect::<Vec<_>>();
        Ok(hidden_replies)
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


#[update]
#[candid_method(update)]
async fn canister_status() ->  CanisterStatusResponse {
    let args = CanisterIdRecord { canister_id: ic_cdk::id() }; 
    let (canister_status, ) = ic_cdk::call::<_,(CanisterStatusResponse,)>(Principal::management_canister(), "canister_status", (args,)).await.unwrap();
    canister_status
}

#[derive(CandidType, Deserialize)]
pub struct StableState {
    pub state: State,
    pub storage: ic_certified_assets::StableState,
}

#[pre_upgrade]
fn pre_upgrade() {
    let state_pre_upgrade = STATE.with(|s| s.borrow().clone());

    let state = StableState {
        state: state_pre_upgrade,
        storage: ic_certified_assets::pre_upgrade(),
    };

    ic_cdk::storage::stable_save((state,)).unwrap();
}

#[post_upgrade]
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
    store_assets_to_temp(parent_canister, &upgrade.assets, &upgrade.version, &upgrade.track.name).await.unwrap();

    // upgrade wasm
    let wasm = get_asset("/temp/child.wasm".to_owned());
    upgrade_canister_cb(wasm);

    Ok(())
}

#[test]
fn candid_interface_compatibility() {
    use candid_parser::utils::{service_compatible, CandidSource};
    use crate::icrc7::*;
    use icrc_ledger_types::icrc1::account::Account;
    use std::path::PathBuf;

    candid::export_service!();
    let new_interface = __export_service();

    let old_interface = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("child.did");

    service_compatible(
        CandidSource::Text(&new_interface),
        CandidSource::File(old_interface.as_path()),
    ).expect("The assets canister interface is not compatible with the child.did file");
}
