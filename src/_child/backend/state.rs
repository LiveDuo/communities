use candid::{CandidType, Deserialize, Principal};

use std::hash::Hash;
use std::cmp::Ordering;
use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap, BTreeSet};

use crate::icrc7::Icrc7Token;
use crate::icrc3::Transaction;


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
    pub active_principal: Principal,
    pub timestamp: u64,
    pub last_login: u64

}
#[derive(Clone, CandidType, Deserialize, Debug, PartialEq, Eq)]
pub enum PostStatus {
    Visible,
    Hidden
}

#[derive(Clone, CandidType, Deserialize, Debug, PartialEq, Eq)]
pub struct Post {
    pub title: String,
    pub description: String,
    pub timestamp: u64,
    pub status: PostStatus
}
#[derive(Clone, CandidType, Deserialize, Debug, PartialEq, Eq)]
pub enum ReplyStatus {
    Visible,
    Hidden
}
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct Reply {
    pub text: String,
    pub timestamp: u64,
    pub status: ReplyStatus
}
#[derive(CandidType, Deserialize, Debug, Clone)]
pub struct ReplyResponse {
    pub text: String,
    pub timestamp: u64,
    pub authentication: AuthenticationWithAddress,
    pub reply_id: u64,
    pub likes: Vec<(u64, AuthenticationWithAddress)>,
    pub status: ReplyStatus
}

#[derive(Clone, CandidType, Deserialize, Debug)]
pub struct PostResponse {
    pub title: String,
    pub post_id: u64,
    pub description: String,
    pub authentication: AuthenticationWithAddress,
    pub likes: Vec<(u64, AuthenticationWithAddress)>,
    pub timestamp: u64,
    pub status: PostStatus,
    pub replies: Vec<ReplyResponse>,
}
#[derive(Clone, CandidType, Deserialize, Debug)]
pub struct ProfileWithStatsResponse {
    pub name: String,
    pub description: String,
    pub authentication: Authentication,
    pub active_principal: Principal,
    pub roles: Vec<UserRole>,
    pub last_login: u64,
    pub join_date: u64,
    pub total_posts: u64,
    pub total_replies: u64,
    pub total_likes: u64
}

#[derive(Clone, CandidType, Deserialize, Debug)]
pub struct ProfileResponse {
    pub name: String,
    pub description: String,
    pub authentication: Authentication,
    pub active_principal: Principal,
    pub roles: Vec<UserRole>,
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
    pub status: PostStatus
}


#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum UserRole {
    Admin
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct  Role {
    pub timestamp: u64,
    pub role: UserRole
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct LikedPost {
    pub timestamp: u64
}
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct LikedReply {
    pub timestamp: u64
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

    pub fn remove(&mut self, x: X, y: Y) {
        let forward_x = self.forward.get_mut(&x).unwrap();
        forward_x.remove(&y.clone());
        if forward_x.is_empty() {
            self.forward.remove(&x);
        }

        let backward_y = self.backward.get_mut(&y).unwrap();
        backward_y.remove(&x.clone());
        if backward_y.is_empty() {
            self.backward.remove(&y);
        }
    }
}
#[derive(Debug, PartialEq, Eq, Clone, CandidType, Deserialize)]
pub struct ValueEntry<K, V>((K, V)); // index key, index value

impl <K: Eq + Ord, V: Eq + PartialOrd + Ord>Ord for ValueEntry<K, V> {
    fn cmp(&self, other: &Self) -> Ordering {
        if self == other { Ordering::Equal }
        else if self.0.1 > other.0.1 { Ordering::Less }
        else { Ordering::Greater }
    }
}

impl <K: PartialEq + Ord, V: Eq + Ord>PartialOrd for ValueEntry<K, V> {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl <K: Eq + Ord, V: Eq + PartialOrd> ValueEntry<K, V> {
    pub fn new(k: K, v: V) -> Self {
        Self((k,v))
    }

    pub fn get(&self) -> (&K, &V) {
        (&self.0.0, &self.0.1)
    }
}
#[derive(Default, CandidType, Clone, Deserialize, Debug)]
pub struct Relations {
    pub profile_id_to_post_id: Relation<u64, u64>,
    pub profile_id_to_reply_id: Relation<u64, u64>,
    pub reply_id_to_post_id: Relation<u64, u64>,
    pub profile_id_to_role_id: Relation<u64, u64>,
    pub post_id_to_liked_post_id: Relation<u64, u64>,
    pub profile_id_to_liked_post_id: Relation<u64, u64>,
    pub reply_id_to_liked_reply_id: Relation<u64, u64>,
    pub profile_id_to_liked_reply_id: Relation<u64, u64>,
}

#[derive(Default, CandidType, Clone, Deserialize, Debug)]
pub struct Indexes {
    pub profile: HashMap<AuthenticationWithAddress, u64>,
    pub active_principal: HashMap<Principal, u64>,
    pub has_liked_post: HashMap<(u64, u64), ()>,
    pub has_liked_reply: HashMap<(u64, u64), ()>,
    pub most_liked_replies: HashMap<u64, BTreeSet<ValueEntry<u64, u64>>>,
    pub most_liked_posts: HashMap<u64, BTreeSet<ValueEntry<u64, u64>>>,
}
#[derive(CandidType, Clone, Deserialize, Debug)]
pub struct Metadata {
    pub version: String,
    pub track: String
}

#[derive(Default, CandidType, Deserialize, Clone, Debug)]
pub struct State {
    pub profiles: BTreeMap<u64, Profile>,
    pub posts: BTreeMap<u64, Post>,
    pub replies: BTreeMap<u64, Reply>,
    pub roles: BTreeMap<u64, Role>,
    pub liked_posts: BTreeMap<u64, LikedPost>,
    pub liked_replies: BTreeMap<u64, LikedReply>,
    pub relations: Relations,
    pub indexes: Indexes,
    pub parent: Option<Principal>,
    pub version: Option<String>,
    pub track: Option<String>,
    pub tokens: BTreeMap<u128, Icrc7Token>,
    pub txn_log: BTreeMap<u128, Transaction>,
    pub uuid_count: u64
}

thread_local! {
    pub static STATE: RefCell<State> = RefCell::new(State::default());
}
