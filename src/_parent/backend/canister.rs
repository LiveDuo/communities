use ic_cdk::{export::candid::candid_method, api};
use ic_ledger_types::{AccountIdentifier, DEFAULT_SUBACCOUNT, Memo, Tokens, MAINNET_LEDGER_CANISTER_ID};
use ic_cdk_macros::{init, query, update};

use candid::{CandidType, Principal};

use serde::{Deserialize};

use std::cell::RefCell;

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

#[derive(Default)]
pub struct State { ledger: Option<Principal> }

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

pub const PAYMENT_AMOUNT: u64 = 100_000_000; // 1 ICP
pub const TRANSFER_FEE: u64 = 10_000;

#[init]
fn init(ledger: Option<Principal>) {

	STATE.with(|s| { s.borrow_mut().ledger = ledger; });

    ic_certified_assets::init();
}

#[query(name = "get_asset_test")]
#[candid_method(query, rename = "get_asset_test")]
fn get_asset_test() {
	let asset_name = "/child/child.wasm".to_owned();
	let asset = ic_certified_assets::get_asset(asset_name);
	ic_cdk::println!("Chunks: {}", asset.len());
}

fn _get_content_type(name: &str) -> String {
	if name.ends_with(".html") { return "text/html".to_string() }
	else if name.ends_with(".js") { return "text/javascript".to_string() }
	else if name.ends_with(".css") { return "text/css".to_string() } 
	else if name.ends_with(".txt") { return "text/plain".to_string() }
	else if name.ends_with(".md") { return "text/markdown".to_string() }
	else { return "application/octet-stream".to_string() }
}

#[update]
#[candid_method(update)]
pub async fn create_child_canister() -> Result<Principal, String> {

	let canister_id = ic_cdk::api::id();
	let caller = ic_cdk::caller();
	let ledger_canister_id = STATE.with(|s| s.borrow().ledger).unwrap_or(MAINNET_LEDGER_CANISTER_ID);
    let account = AccountIdentifier::new(&canister_id, &principal_to_subaccount(&caller));
    let balance_args = ic_ledger_types::AccountBalanceArgs { account };
    
	let tokens: Tokens = match ic_ledger_types::account_balance(ledger_canister_id, balance_args).await {
        Ok(x) => x,
        Err((code, msg)) => return Err(format!("Account balance error: {}: {}", code as u8, msg))
    };

	if tokens.e8s() < PAYMENT_AMOUNT { return Err(format!("Insufficient balance")) }

	let transfer_args = ic_ledger_types::TransferArgs {
		memo: Memo(0),
		amount: Tokens::from_e8s(PAYMENT_AMOUNT),
		fee: Tokens::from_e8s(TRANSFER_FEE),
		from_subaccount: Some(principal_to_subaccount(&caller)),
		to: AccountIdentifier::new(&canister_id, &DEFAULT_SUBACCOUNT),
		created_at_time: None,
	};

	match ic_ledger_types::transfer(ledger_canister_id, transfer_args).await {
		Ok(_) => {},
		Err((code, msg)) => return Err(format!("Transfer balance error: {}: {}", code as u8, msg))
	};

	let create_args = CreateCanisterArgs {
		settings: CreateCanisterSettings {
			controllers: Some(vec![canister_id, caller]),
			compute_allocation: None,
			memory_allocation: None,
			freezing_threshold: None
		}
	};

	let (create_result,): (CreateCanisterResult,) = match api::call::call_with_payment(
		Principal::management_canister(), "create_canister", (create_args,), 200_000_000_000)
	.await {
		Ok(x) => x,
		Err((code, msg)) => { return Err(format!("Create canister error: {}: {}", code as u8, msg)) }
	};

	let wasm_bytes: Vec<u8> = ic_certified_assets::get_asset("/child/child.wasm".to_string());
	if wasm_bytes.is_empty() {
		return Err(format!("WASM is not yet uploaded"))
	}

	let install_args = InstallCanisterArgs {
		mode: InstallMode::Install,
		canister_id: create_result.canister_id,
		wasm_module: wasm_bytes,
		arg: b" ".to_vec(),
	};
	
	match api::call::call(Principal::management_canister(), "install_code", (install_args,),).await {
		Ok(x) => x,
		Err((code, msg)) => { return Err(format!("Install code error: {}: {}", code as u8, msg)) }
	}

	let bundle_bytes: Vec<u8> = ic_certified_assets::get_asset("/child/static/js/bundle.js".to_string());

	let canister_str = &create_result.canister_id.to_string();
	let bundle_str = String::from_utf8(bundle_bytes).expect("Invalid JS bundle");
	let bundle_with_env = bundle_str.replace("REACT_APP_BACKEND_CANISTER_ID", canister_str);
	
	let assets_bytes: Vec<u8> = ic_certified_assets::get_asset("/child/frontend.assets".to_string());
	let assets_str = String::from_utf8(assets_bytes.clone()).expect("Invalid frontend.assets");
	let assets: Vec<serde_json::Value> = serde_json::from_str(&assets_str).expect("Invalid JSON");
	for asset in &assets {
		
		let asset_str = &asset.as_str().unwrap();
		let asset_bytes: Vec<u8> = ic_certified_assets::get_asset(["/child", asset_str].join(""));
		let content = if asset_str == &"/static/js/bundle.js" { bundle_with_env.as_bytes().to_vec() } else { asset_bytes };

		let store_args = StoreAssetArgs {
			key: asset_str.to_string(), // remove "/child" prefix
			content_type: _get_content_type(asset_str),
			content_encoding: "identity".to_owned(),
			content: content,
		};

		match api::call::call(create_result.canister_id, "store", (store_args,),).await {
			Ok(x) => x,
			Err((_code, _msg)) => {}
		}
    }

	Ok(create_result.canister_id)
}

#[export_name = "pre_upgrade"]
fn pre_upgrade() {
	ic_cdk::storage::stable_save((ic_certified_assets::pre_upgrade(),))
        .expect("failed to save stable state");
}

#[export_name = "post_upgrade"]
fn post_upgrade() {
	let (stable_state,): (ic_certified_assets::StableState,) =
        ic_cdk::storage::stable_restore().expect("failed to restore stable state");
    ic_certified_assets::post_upgrade(stable_state);
}

#[query]
#[candid_method(query)]
fn http_request(req: ic_certified_assets::types::HttpRequest) -> ic_certified_assets::types::HttpResponse {
	return ic_certified_assets::http_request_handle(req);
}
