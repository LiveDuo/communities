use candid::{CandidType, Principal, Deserialize};

use serde::Serialize;

use std::cell::RefCell;

use sha2::Digest;

use crate::helpers::principal_to_subaccount;

#[derive(CandidType, Deserialize, Debug, Clone)]
struct Asset { data: Vec<u8>, temp: Vec<u8> }

#[derive(CandidType, Deserialize)]
enum InstallMode {
	#[serde(rename = "install")] Install,
	#[serde(rename = "reinstall")] Reinstall,
	#[serde(rename = "upgrade")] Upgrade,
}

#[derive(CandidType, Deserialize)]
struct InstallCanisterArgs {
	mode: InstallMode,
	canister_id: Principal,
	#[serde(with = "serde_bytes")] wasm_module: Vec<u8>,
	arg: Vec<u8>,
}

#[derive(CandidType, Deserialize)]
struct CreateCanisterSettings {
	controllers: Option<Vec<Principal>>,
	compute_allocation: Option<u128>,
	memory_allocation: Option<u128>,
	freezing_threshold: Option<u128>,
}

#[derive(CandidType, Deserialize)]
struct StoreAssetArgs {
	key: String,
	content_type: String,
	content_encoding: String,
	content: Vec<u8>,
}

#[derive(CandidType)]
struct CreateCanisterArgs { settings: CreateCanisterSettings, }

#[derive(CandidType, Deserialize)]
struct CreateCanisterResult { canister_id: Principal, }

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
pub struct State { config: Config }

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

pub const PAYMENT_AMOUNT: u64 = 100_000_000; // 1 ICP
pub const TRANSFER_FEE: u64 = 10_000;

pub const MAINNET_LEDGER_CANISTER_ID: Principal =
    Principal::from_slice(&[0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x01, 0x01]);

#[ic_cdk_macros::init]
fn init(env_opt: Option<Environment>) {

	if let Some(env) = env_opt {
        STATE.with(|s| { s.borrow_mut().config = Config { env }; });
    }

    ic_certified_assets::init();
}

#[ic_cdk_macros::query]
fn get_asset_test() {
	let asset_name = "/child/child.wasm".to_owned();
	let asset = ic_certified_assets::get_asset(asset_name);
	ic_cdk::println!("Chunks: {}", asset.len());
}

fn get_content_type(name: &str) -> String {
	if name.ends_with(".html") { return "text/html".to_string() }
	else if name.ends_with(".js") { return "text/javascript".to_string() }
	else if name.ends_with(".css") { return "text/css".to_string() } 
	else if name.ends_with(".txt") { return "text/plain".to_string() }
	else if name.ends_with(".md") { return "text/markdown".to_string() }
	else { return "application/octet-stream".to_string() }
}

async fn store_assets(canister_id: Principal) -> Result<(), String> {

	let assets = ic_certified_assets::list_assets();
	for asset in &assets {
	
		// skip unnecessary files
		if !asset.key.starts_with("/child") || asset.key == "/child/child.wasm" { continue; }

		// get asset content
		let asset_bytes: Vec<u8> = ic_certified_assets::get_asset(asset.key.to_string());
		let content;
		if asset.key == "/child/static/js/bundle.js" {
			let bundle_str = String::from_utf8(asset_bytes).expect("Invalid JS bundle");
			let bundle_with_env = bundle_str.replace("REACT_APP_CHILD_CANISTER_ID", &canister_id.to_string());
			content = bundle_with_env.as_bytes().to_vec();
		} else {
			content = asset_bytes;
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

async fn install_code(_caller: Principal, canister_id: Principal) -> Result<(), String> {
	let wasm_bytes: Vec<u8> = ic_certified_assets::get_asset("/child/child.wasm".to_string());
	if wasm_bytes.is_empty() {
		return Err(format!("WASM is not yet uploaded"))
	}

	let install_args = InstallCanisterArgs {
		mode: InstallMode::Install,
		canister_id: canister_id,
		wasm_module: wasm_bytes,
		arg: b" ".to_vec(),
	};
	
	match ic_cdk::api::call::call(Principal::management_canister(), "install_code", (install_args,),).await {
		Ok(x) => Ok(x),
		Err((code, msg)) => { return Err(format!("Install code error: {}: {}", code as u8, msg)) }
	}
}

async fn create_canister(caller: Principal, canister_id: Principal) -> Result<Principal, String> {
	let create_args = CreateCanisterArgs {
		settings: CreateCanisterSettings {
			controllers: Some(vec![canister_id, caller]),
			compute_allocation: None,
			memory_allocation: None,
			freezing_threshold: None
		}
	};

	let (create_result,): (CreateCanisterResult,) = match ic_cdk::api::call::call_with_payment(
		Principal::management_canister(), "create_canister", (create_args,), 200_000_000_000)
	.await {
		Ok(x) => x,
		Err((code, msg)) => { return Err(format!("Create canister error: {}: {}", code as u8, msg)) }
	};
	Ok(create_result.canister_id)
}

async fn mint_cycles(caller: Principal, canister_id: Principal) -> Result<(), String> {
    
	let account = AccountIdentifier::new(&canister_id, &principal_to_subaccount(&caller));
    
    let account_balance_args = AccountBalanceArgs { account: account };

	let balance_result: Result<(Tokens,), _> = ic_cdk::call(MAINNET_LEDGER_CANISTER_ID, "account_balance", (account_balance_args,),)
		.await;

	let tokens: Tokens = match balance_result {
        Ok(x) => x.0,
        Err((code, msg)) => return Err(format!("Account balance error: {}: {}", code as u8, msg))
    };

	if tokens.e8s < PAYMENT_AMOUNT { return Err(format!("Insufficient balance")) }

	let default_subaccount = Subaccount([0; 32]);

	let transfer_args = TransferArgs {
        memo: Memo(1347768404),
        amount: Tokens { e8s: PAYMENT_AMOUNT },
        fee: Tokens { e8s: TRANSFER_FEE },
        from_subaccount: Some(principal_to_subaccount(&caller)),
        to: AccountIdentifier::new(&canister_id, &default_subaccount),
        created_at_time: None,
    };

	let _transfer_result: (TransferResult,) =
        ic_cdk::call(MAINNET_LEDGER_CANISTER_ID, "transfer", (transfer_args,))
            .await
            .map_err(|(code, msg)| format!("Transfer error: {}: {}", code as u8, msg))
            .unwrap();

	Ok(())
}

#[ic_cdk_macros::update]
pub async fn create_child() -> Result<Principal, String> {

	let canister_id = ic_cdk::api::id();
	let caller = ic_cdk::caller();
	
	let config = STATE.with(|s| { s.borrow().config });

	if config.env == Environment::Production {
		mint_cycles(caller, canister_id).await.unwrap();
	};

	let created_id = create_canister(caller, canister_id).await.unwrap();

	install_code(caller, created_id).await.unwrap();

	store_assets(created_id).await.unwrap();

	Ok(created_id)
}

#[ic_cdk_macros::pre_upgrade]
fn pre_upgrade() {
	ic_cdk::storage::stable_save((ic_certified_assets::pre_upgrade(),))
        .expect("failed to save stable state");
}

#[ic_cdk_macros::post_upgrade]
fn post_upgrade() {
	let (stable_state,): (ic_certified_assets::StableState,) =
        ic_cdk::storage::stable_restore().expect("failed to restore stable state");
    ic_certified_assets::post_upgrade(stable_state);
}

#[ic_cdk_macros::query]
fn http_request(req: ic_certified_assets::types::HttpRequest) -> ic_certified_assets::types::HttpResponse {
	return ic_certified_assets::http_request_handle(req);
}
