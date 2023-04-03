use candid::{CandidType, Principal, Deserialize};

use serde::Serialize;

use std::cell::RefCell;

use sha2::Digest;

use std::convert::TryInto;

#[derive(CandidType, Deserialize, Debug, Clone)]
struct Asset { data: Vec<u8>, temp: Vec<u8> }

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
pub struct CreateCanisterSettings {
	pub controllers: Option<Vec<Principal>>,
	pub compute_allocation: Option<u128>,
	pub memory_allocation: Option<u128>,
	pub freezing_threshold: Option<u128>,
}

#[derive(CandidType, Deserialize)]
pub struct StoreAssetArgs {
	pub key: String,
	pub content_type: String,
	pub content_encoding: String,
	pub content: Vec<u8>,
}

#[derive(CandidType)]
pub struct CreateCanisterArgs { pub settings: CreateCanisterSettings, }

#[derive(CandidType, Deserialize)]
pub struct CreateCanisterResult { pub canister_id: Principal, }

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

#[derive(CandidType, Deserialize, Debug, Copy, Clone, PartialEq, Default)]
pub enum Environment {
    #[default] Development,
    Staging,
    Production,
}

#[derive(CandidType, Deserialize, Debug, Copy, Clone, Default)]
pub struct Config {
    pub env: Environment,
}

#[derive(Default)]
pub struct State { pub config: Config }

thread_local! {
    pub static STATE: RefCell<State> = RefCell::new(State::default());
}