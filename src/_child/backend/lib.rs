use candid::{export_service, CandidType, Deserialize, Principal};

use ic_cdk_macros::*;
use std::borrow::Borrow;
use std::collections::hash_map;
use std::hash::{Hash, Hasher};

use ed25519_dalek::{PublicKey, Signature, Verifier};
use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap};

#[derive(Clone, CandidType, Deserialize, Default, Hash, PartialEq, Eq, Debug)]
pub struct EvmParams {
    address: String,
}

#[derive(Clone, CandidType, Deserialize, Default, Hash, PartialEq, Eq, Debug)]
pub struct SvmParams {
    address: String,
}
#[derive(Clone, CandidType, Deserialize, Hash, PartialEq, Eq, Debug)]
pub struct IcParams {
    principal: Principal,
}

#[derive(Clone, CandidType, Deserialize, Hash, PartialEq, Eq, Debug)]
pub enum Authentication {
    Evm(EvmParams),
    Svm(SvmParams),
    Ic(IcParams),
}

#[derive(Clone, CandidType, Deserialize, Default, Hash, PartialEq, Eq, Debug)]
pub struct EvmAuthenticationWithParams {
    message: String,
    signature: String,
}

#[derive(Clone, CandidType, Deserialize, Default, Hash, PartialEq, Eq, Debug)]
pub struct SvmAuthenticationWithParams {
    public_key: String,
    signature: String,
    message: String,
}

#[derive(Clone, CandidType, Deserialize, Hash, PartialEq, Eq, Debug)]
pub enum AuthenticationWith {
    Evm(EvmAuthenticationWithParams),
    Svm(SvmAuthenticationWithParams),
    Ic,
}

#[derive(Clone, CandidType, Deserialize, Debug, PartialEq, Eq)]
pub struct Profile {
    pub name: String,
    pub description: String,
    pub authentication: Authentication,
}

#[derive(Clone, CandidType, Deserialize, Debug, PartialEq, Eq)]
pub struct Post {
    pub title: String,
    pub description: String,
    pub timestamp: u64,
}
#[derive(Clone, CandidType, Deserialize, Debug)]
pub struct PostResult {
    pub title: String,
    pub description: String,
    pub timestamp: u64,
    pub replies: Vec<Reply>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct PostSummary {
    pub post_id: u64,
    pub title: String,
    pub description: String,
    pub timestamp: u64,
    pub address: String,
    pub replies_count: u64,
    pub last_activity: u64,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Reply {
    pub text: String,
    pub timestamp: u64,
    pub address: String,
}

#[derive(Default, CandidType, Clone, Deserialize, Debug)]
pub struct Relation<X: Ord, Y: Ord> {
    forward: BTreeMap<X, BTreeMap<Y, ()>>,
    backward: BTreeMap<Y, BTreeMap<X, ()>>,
}
impl<X: Ord + Clone, Y: Ord + Clone> Relation<X, Y> {
    fn insert(&mut self, x: X, y: Y) {
        if self.forward.contains_key(&x) {
            self.forward.get_mut(&x).unwrap().insert(y.clone(), ());
        } else {
            self.forward
                .insert(x.clone(), BTreeMap::from_iter([(y.clone(), ())]));
        }

        if self.backward.contains_key(&y) {
            self.backward.get_mut(&y).unwrap().insert(x, ());
        } else {
            self.backward
                .insert(y, BTreeMap::from_iter([(x.clone(), ())]));
        }
    }
}

#[derive(CandidType, Clone, Deserialize, Debug)]
pub struct Relations {
    principal_to_post_id: Relation<Principal, u64>,
    principal_to_reply_id: Relation<Principal, u64>,
    reply_id_to_post_id: Relation<u64, u64>,
}

impl Default for Relations {
    fn default() -> Self {
        let relation_u64_to_u64: Relation<u64, u64> = Relation {
            forward: BTreeMap::default(),
            backward: BTreeMap::default(),
        };
        let relation_principal_to_u64: Relation<Principal, u64> = Relation {
            forward: BTreeMap::default(),
            backward: BTreeMap::default(),
        };

        Relations {
            reply_id_to_post_id: { relation_u64_to_u64 },
            principal_to_reply_id: { relation_principal_to_u64.clone() },
            principal_to_post_id: { relation_principal_to_u64 },
        }
    }
}

#[derive(Default, CandidType, Clone, Deserialize, Debug)]
pub struct Indexes {
    profile: HashMap<Authentication, Principal>,
}

#[derive(Default, CandidType, Deserialize, Clone, Debug)]
pub struct State {
    profiles: BTreeMap<Principal, Profile>,
    posts: BTreeMap<u64, Post>,
    replay: BTreeMap<u64, Reply>,
    relations: Relations,
    indexes: Indexes,
}

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

#[update]
fn create_profile(auth: AuthenticationWith) -> Result<Profile, String> {
    let caller = ic_cdk::caller();

    STATE.with(|s| {
        let mut state = s.borrow_mut();

        if state.profiles.contains_key(&caller) {
            return Err("Profile exists".to_owned());
        }

        let authentication = match auth {
            AuthenticationWith::Evm(args) => {
                let parm = verify_emv(args);
                Authentication::Evm(parm)
            }
            AuthenticationWith::Svm(args) => {
                let parm = verify_svm(args);
                Authentication::Svm(parm)
            }
            AuthenticationWith::Ic => {
                let parm = IcParams {
                    principal: caller.clone(),
                };
                Authentication::Ic(parm)
            }
        };

        state
            .indexes
            .profile
            .insert(authentication.to_owned(), caller.clone());

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
fn create_post(title: String, description: String) -> Result<Post, String> {
    let caller = ic_cdk::caller();

    STATE.with(|s| {
        let mut state = s.borrow_mut();

        if !state.profiles.contains_key(&caller) {
            return Err("Profile does not exists".to_owned());
        }

        let post = Post {
            title,
            description,
            timestamp: ic_cdk::api::time(),
        };

        let post_id = uuid(&caller.to_text());

        state.posts.insert(post_id, post.clone());

        state.relations.principal_to_post_id.insert(caller, post_id);
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
            return Err("Profile does not exists".to_owned());
        }

        if !state.posts.contains_key(&post_id) {
            return Err("This post does not exist".to_owned());
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
fn get_posts() -> Vec<PostSummary> {
    STATE.with(|s| {
        let state = &mut s.borrow_mut();

        state
            .posts
            .iter()
            .map(|p| {
                let post_id = p.0;
                let replies_opt = state.relations.reply_id_to_post_id.backward.get(&post_id);

                let replies_count = if replies_opt == None {
                    0
                } else {
                    replies_opt.borrow().unwrap().len()
                };

                let last_activity = if replies_opt == None {
                    0
                } else {
                    let reply_id = replies_opt.unwrap().last_key_value().unwrap().0;
                    state.replay.get(reply_id).unwrap().timestamp
                };

                // FIX
                let principal = state
                    .relations
                    .principal_to_post_id
                    .backward
                    .get(&post_id)
                    .unwrap()
                    .keys()
                    .collect::<Vec<_>>()[0];

                let address = get_address(&state.profiles.get(&principal).unwrap().authentication);

                PostSummary {
                    title: p.1.title.to_owned(),
                    post_id: post_id.to_owned(),
                    description: p.1.description.to_owned(),
                    timestamp: p.1.timestamp,
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
        let profile_otp = state.profiles.get(&caller);
        if profile_otp == None {
            return Err("Profile does not exists".to_owned());
        }

        Ok(profile_otp.unwrap().clone())
    })
}

#[query]
fn get_post(post_id: u64) -> Result<PostResult, String> {
    STATE.with(|s| {
        let state = s.borrow();
        let post_otp = state.posts.get(&post_id);
        if post_otp == None {
            return Err("This post does not exists".to_owned());
        }

        let replies = state
            .relations
            .reply_id_to_post_id
            .backward
            .get(&post_id)
            .unwrap()
            .iter()
            .map(|v| state.replay.get(v.0).unwrap().to_owned())
            .collect::<Vec<_>>();

        let post = post_otp.unwrap();

        let post_result = PostResult {
            replies,
            title: post.title.to_owned(),
            timestamp: post.timestamp,
            description: post.description.to_owned(),
        };

        Ok(post_result)
    })
}

#[query]
fn get_posts_by_user(authentication: Authentication) -> Result<Vec<Post>, String> {
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
            .map(|k| state.posts.get(&k.0.to_owned()).unwrap().to_owned())
            .collect::<Vec<_>>();
        Ok(user_post)
    })
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

fn verify_svm(args: SvmAuthenticationWithParams) -> SvmParams {
    let public_key = hex::decode(&args.public_key).unwrap();

    let signature = hex::decode(&args.signature).unwrap();
    let msg = hex::decode(&args.message).unwrap();

    let public_key = PublicKey::from_bytes(&public_key).unwrap();
    let sig = Signature::from_bytes(&signature).unwrap();
    public_key.verify(&msg, &sig).unwrap();

    SvmParams {
        address: args.public_key,
    }
}

fn verify_emv(args: EvmAuthenticationWithParams) -> EvmParams {
    let mut signature_bytes = hex::decode(&args.signature.trim_start_matches("0x")).unwrap();
    let recovery_byte = signature_bytes.pop().expect("No recovery byte");
    let recovery_id = libsecp256k1::RecoveryId::parse_rpc(recovery_byte).unwrap();
    let signature_slice = signature_bytes.as_slice();
    let signature_bytes: [u8; 64] = signature_slice.try_into().unwrap();
    let signature = libsecp256k1::Signature::parse_standard(&signature_bytes).unwrap();
    let message_bytes = hex::decode(&args.message.trim_start_matches("0x")).unwrap();
    let message_bytes: [u8; 32] = message_bytes.try_into().unwrap();
    let message = libsecp256k1::Message::parse(&message_bytes);
    let public_key = libsecp256k1::recover(&message, &signature, &recovery_id).unwrap();
    let public_key_bytes = public_key.serialize();
    let keccak256 = easy_hasher::easy_hasher::raw_keccak256(public_key_bytes[1..].to_vec());
    let keccak256_hex = keccak256.to_hex_string();
    let address: String = "0x".to_owned() + &keccak256_hex[24..];

    EvmParams { address }
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
