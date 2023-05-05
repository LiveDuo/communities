use candid::{CandidType, Deserialize, Principal};

use std::hash::{Hash};

use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap};

#[derive(Clone, CandidType, Deserialize, Default, Hash, PartialEq, Eq, Debug)]
pub struct EvmParams {
    pub address: String,
}

#[derive(Clone, CandidType, Deserialize, Default, Hash, PartialEq, Eq, Debug)]
pub struct SvmParams {
    pub address: String,
}
#[derive(Clone, CandidType, Deserialize, Hash, PartialEq, Eq, Debug)]
pub struct IcParams {
    pub principal: Principal,
}

#[derive(Clone, CandidType, Deserialize, Hash, PartialEq, Eq, Debug)]
pub enum Authentication {
    Evm(EvmParams),
    Svm(SvmParams),
    Ic,
}

#[derive(Clone, CandidType, Deserialize, Hash, PartialEq, Eq, Debug)]
pub enum AuthenticationWithAddress {
    Evm(EvmParams),
    Svm(SvmParams),
    Ic(IcParams),
}

#[derive(Clone, CandidType, Deserialize, Default, Hash, PartialEq, Eq, Debug)]
pub struct EvmAuthenticationWithParams {
    pub message: String,
    pub signature: String,
}

#[derive(Clone, CandidType, Deserialize, Default, Hash, PartialEq, Eq, Debug)]
pub struct SvmAuthenticationWithParams {
    pub public_key: String,
    pub signature: String,
    pub message: String,
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
    pub active_principal: Principal
}

#[derive(Clone, CandidType, Deserialize, Debug, PartialEq, Eq)]
pub struct Post {
    pub title: String,
    pub description: String,
    pub timestamp: u64,
}

#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Reply {
    pub text: String,
    pub timestamp: u64,
}
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct ReplyResponse {
    pub text: String,
    pub timestamp: u64,
    pub authentication: AuthenticationWithAddress,
}

#[derive(Clone, CandidType, Deserialize, Debug)]
pub struct PostResponse {
    pub title: String,
    pub description: String,
    pub authentication: AuthenticationWithAddress,
    pub timestamp: u64,
    pub replies: Vec<ReplyResponse>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct PostSummary {
    pub post_id: u64,
    pub title: String,
    pub description: String,
    pub timestamp: u64,
    pub authentication: AuthenticationWithAddress,
    pub replies_count: u64,
    pub last_activity: u64,
}

#[derive(Default, CandidType, Clone, Deserialize, Debug)]
pub struct Relation<X: Ord, Y: Ord> {
    pub forward: BTreeMap<X, BTreeMap<Y, ()>>,
    pub backward: BTreeMap<Y, BTreeMap<X, ()>>,
}
impl<X: Ord + Clone, Y: Ord + Clone> Relation<X, Y> {
    pub fn insert(&mut self, x: X, y: Y) {
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
    pub profile_id_to_post_id: Relation<u64, u64>,
    pub profile_id_to_reply_id: Relation<u64, u64>,
    pub reply_id_to_post_id: Relation<u64, u64>,
}

impl Default for Relations {
    fn default() -> Self {
        let relation_u64_to_u64: Relation<_, _> = Relation {
            forward: BTreeMap::default(),
            backward: BTreeMap::default(),
        };

        Relations {
            profile_id_to_post_id: { relation_u64_to_u64.to_owned() },
            profile_id_to_reply_id: { relation_u64_to_u64.to_owned() },
            reply_id_to_post_id: { relation_u64_to_u64 },
        }
    }
}

#[derive(Default, CandidType, Clone, Deserialize, Debug)]
pub struct Indexes {
    pub profile: HashMap<AuthenticationWithAddress, u64>,
    pub active_principal: HashMap<Principal, u64>
}

#[derive(Default, CandidType, Deserialize, Clone, Debug)]
pub struct State {
    pub profiles: BTreeMap<u64, Profile>,
    pub posts: BTreeMap<u64, Post>,
    pub replies: BTreeMap<u64, Reply>,
    pub relations: Relations,
    pub indexes: Indexes,
    pub parent: Option<Principal>,
    pub wasm_hash: Option<Vec<u8>>,
}

thread_local! {
    pub static STATE: RefCell<State> = RefCell::new(State::default());
}
