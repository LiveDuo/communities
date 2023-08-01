use candid::{CandidType, Deserialize, Principal};

use serde::Serialize;
use std::iter::FromIterator;

use sha2::Digest;

use std::cell::RefCell;
use std::collections::{BTreeMap, HashMap};
use std::convert::TryInto;

#[derive(CandidType, Deserialize)]
pub struct StoreAssetArgs {
    pub key: String,
    pub content_type: String,
    pub content_encoding: String,
    pub content: Vec<u8>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AccountIdentifier(pub [u8; 32]);
impl AccountIdentifier {
    pub fn new(owner: &Principal, subaccount: &Subaccount) -> Self {
        let mut hasher = sha2::Sha224::new();
        hasher.update(b"\x0Aaccount-id");
        hasher.update(owner.as_slice());
        hasher.update(&subaccount.0[..]);
        let hash: [u8; 28] = hasher.finalize().into();

        let mut hasher = crc32fast::Hasher::new();
        hasher.update(&hash);
        let crc32_bytes = hasher.finalize().to_be_bytes();

        let mut result = [0u8; 32];
        result[0..4].copy_from_slice(&crc32_bytes[..]);
        result[4..32].copy_from_slice(hash.as_ref());
        Self(result)
    }
}

#[derive(CandidType)]
pub struct AccountBalanceArgs {
    pub account: AccountIdentifier,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Subaccount(pub [u8; 32]);

// dfx ledger transfer --ledger-canister-id $(dfx canister id ledger) --amount 1 --memo 1347768404 CANISTER_USER_ACCOUNT
// dfx ledger balance --ledger-canister-id $(dfx canister id ledger) CANISTER_USER_ACCOUNT
pub fn principal_to_subaccount(principal_id: &Principal) -> Subaccount {
    let mut subaccount = [0; std::mem::size_of::<Subaccount>()];
    let principal_id = principal_id.as_slice();
    subaccount[0] = principal_id.len().try_into().unwrap();
    subaccount[1..1 + principal_id.len()].copy_from_slice(principal_id);

    Subaccount(subaccount)
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Timestamp {
    pub timestamp_nanos: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Tokens {
    pub e8s: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Memo(pub u64);

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TransferArgs {
    pub memo: Memo,
    pub amount: Tokens,
    pub fee: Tokens,
    pub from_subaccount: Option<Subaccount>,
    pub to: AccountIdentifier,
    pub created_at_time: Option<Timestamp>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum TransferError {
    BadFee { expected_fee: Tokens },
    InsufficientFunds { balance: Tokens },
    TxTooOld { allowed_window_nanos: u64 },
    TxCreatedInFuture,
    TxDuplicate { duplicate_of: BlockIndex },
}

pub type BlockIndex = u64;
pub type TransferResult = Result<BlockIndex, TransferError>;

#[derive(CandidType, Deserialize, Default, Clone, PartialEq, Debug)]
pub enum CanisterState {
    #[default]
    Preparing,
    Creating,
    Installing,
    Uploading,
    Authorizing,
    Ready,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct CanisterData {
    pub id: Option<Principal>,
    pub timestamp: u64,
    pub state: CanisterState,
}

impl Default for CanisterData {
    fn default() -> Self {
        Self {
            id: None,
            timestamp: ic_cdk::api::time(),
            state: CanisterState::Preparing,
        }
    }
}



#[derive(Clone, Debug, CandidType, Deserialize, Serialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct UpgradeFrom {
    pub track: String,
    pub version: String
}
#[derive(Clone, Debug, CandidType, Deserialize, Serialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct Upgrade {
    pub version: String,
    pub upgrade_from: Option<UpgradeFrom>,
    pub timestamp: u64,
    pub assets: Vec<String>,
}
#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct UpgradeWithTrack {
    pub version: String,
    pub upgrade_from: Option<UpgradeFrom>,
    pub timestamp: u64,
    pub assets: Vec<String>,
    pub track: String
}
#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct Track {
    pub name: String,
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
    

#[derive(Default,CandidType, Clone, Deserialize, Debug)]
pub struct Relations {
    pub profile_id_to_canister_id: Relation<u64, u64>,
    pub track_id_to_upgrade_id: Relation<u64, u64>,
}

#[derive(Clone, CandidType, Deserialize, Hash, PartialEq, Eq, Debug)]
pub enum Authentication {
    Ic,
}
#[derive(Clone, CandidType, Deserialize, Debug, PartialEq, Eq)]
pub struct Profile {
    pub authentication: Authentication,
    pub active_principal: Principal,
}

#[derive(Default, CandidType, Clone, Deserialize, Debug)]
pub struct Indexes {
    pub active_principal: HashMap<Principal, u64>,
    pub upgrade_from: HashMap<(String, String), u64>,
    pub version: HashMap<(String, String), u64>,
    pub track: HashMap<String, u64> 
}
#[derive(Default, Clone, CandidType, Deserialize)]
pub struct State {
    pub profiles: BTreeMap<u64, Profile>,
    pub upgrades: BTreeMap<u64, Upgrade>,
    pub tracks: BTreeMap<u64, Track>,
    pub canister_data: BTreeMap<u64, CanisterData>,
    pub indexes: Indexes,
    pub relations: Relations,
}

thread_local! {
    pub static STATE: RefCell<State> = RefCell::new(State::default());
}
