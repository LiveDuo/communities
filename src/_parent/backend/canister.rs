use ic_cdk::export::candid::{candid_method};
use ic_ledger_types::{AccountIdentifier, DEFAULT_SUBACCOUNT, Memo, Tokens};
use ic_cdk::api::{call, caller, id};
use ic_cdk_macros::*;

use candid::{CandidType, Principal};

use serde::{Deserialize};

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

#[init]
fn init() {
    ic_certified_assets::init();
}

#[ic_cdk_macros::query(name = "g")]
#[candid_method(query, rename = "g")]
fn g(key: String) -> Vec<u8> {
	let asset = ic_certified_assets::get_asset_b(&key).as_ref().to_vec();
	return asset;
}

#[ic_cdk_macros::query(name = "l")]
#[candid_method(query, rename = "l")]
fn l() -> candid::Nat {
	let asset = &ic_certified_assets::list()[0];
	return asset.clone().encodings.get(0).expect("Encoding has no elements").clone().length;

	// get total_length
	// get chunk i
	// current_length += chunk[0].length
	// if (current_length >= total_length) break
}

#[ic_cdk_macros::query(name = "get_asset")]
#[candid_method(query, rename = "get_asset")]
fn get_asset(key: String) -> Vec<u8> {
	let asset = ic_certified_assets::get_asset(&key);
	let encodings = asset.encodings.get("identity").expect("There is no identity encoding").clone();
	let mut chunks_vec: Vec<u8> = vec![];
	for chunk in encodings.content_chunks.iter() {
		let chunk = chunk.clone();
		let chunk_vec = chunk.as_ref().to_vec();
		chunks_vec.extend(chunk_vec.iter().cloned());
	}
	return chunks_vec;
}

fn _get_content_type(name: &str) -> String {
	if name.ends_with(".html") { return "text/html".to_string() }
	else if name.ends_with(".js") { return "text/javascript".to_string() }
	else if name.ends_with(".css") { return "text/css".to_string() } 
	else if name.ends_with(".txt") { return "text/plain".to_string() }
	else if name.ends_with(".md") { return "text/markdown".to_string() }
	else { return "application/octet-stream".to_string() }
}

#[ic_cdk_macros::update]
#[candid_method(update)]
pub async fn create_child_canister() -> Result<Principal, String> {

	let create_args = CreateCanisterArgs {
		settings: CreateCanisterSettings {
			controllers: Some(vec![id(), caller()]),
			compute_allocation: None,
			memory_allocation: None,
			freezing_threshold: None
		}
	};

	let (create_result,): (CreateCanisterResult,) = match call::call_with_payment(
		Principal::management_canister(), "create_canister", (create_args,), 200_000_000_000)
	.await {
		Ok(x) => x,
		Err((code, msg)) => { return Err(format!("Create canister error: {}: {}", code as u8, msg)) }
	};

	let wasm_bytes: Vec<u8> = get_asset("/child/child.wasm".to_string());
	if wasm_bytes.is_empty() {
		return Err(format!("WASM is not yet uploaded"))
	}

	let install_args = InstallCanisterArgs {
		mode: InstallMode::Install,
		canister_id: create_result.canister_id,
		wasm_module: wasm_bytes,
		arg: b" ".to_vec(),
	};
	
	match call::call(Principal::management_canister(), "install_code", (install_args,),).await {
		Ok(x) => x,
		Err((code, msg)) => { return Err(format!("Install code error: {}: {}", code as u8, msg)) }
	}

	let bundle_bytes: Vec<u8> = get_asset("/child/static/js/bundle.js".to_string());

	let canister_str = &create_result.canister_id.to_string();
	let bundle_str = String::from_utf8(bundle_bytes).expect("Invalid JS bundle");
	let bundle_with_env = bundle_str.replace("REACT_APP_BACKEND_CANISTER_ID", canister_str);
	
	let assets_bytes: Vec<u8> = get_asset("/child/frontend.assets".to_string());
	let assets_str = String::from_utf8(assets_bytes.clone()).expect("Invalid frontend.assets");
	let assets: Vec<serde_json::Value> = serde_json::from_str(&assets_str).expect("Invalid JSON");
	for asset in &assets {
		
		let asset_str = &asset.as_str().unwrap();
		let asset_bytes: Vec<u8> = get_asset(["/child", asset_str].join(""));
		let content = if asset_str == &"/static/js/bundle.js" { bundle_with_env.as_bytes().to_vec() } else { asset_bytes };

		let store_args = StoreAssetArgs {
			key: asset_str.to_string(), // remove "/child" prefix
			content_type: _get_content_type(asset_str),
			content_encoding: "identity".to_owned(),
			content: content,
		};

		match call::call(create_result.canister_id, "store", (store_args,),).await {
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

// #[export_name = "canister_query http_request"]
// fn http_request() {

// 	let req = call::arg_data::<(ic_certified_assets::types::HttpRequest,)>().0;
// 	ic_cdk::println!("{} {}", req.method, req.url);

// 	ic_certified_assets::http_request_edit(req);
// }

#[ic_cdk_macros::update]
#[candid_method(update)]
async fn create_canister() -> Result<Principal, String> {
    let caller = ic_cdk::caller();
    let canister_id = ic_cdk::api::id();
    let ledger_canister_id = Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(); // MAINNET_LEDGER_CANISTER_ID
    let account = AccountIdentifier::new(&canister_id, &principal_to_subaccount(&caller));
    let balance_args = ic_ledger_types::AccountBalanceArgs { account };
    let amount = 100_000_000;
    match ic_ledger_types::account_balance(ledger_canister_id, balance_args).await {
        Ok(x) => {
            if x.e8s() < amount { // 1 ICP
                return Err(format!("Insufficient balance"))
            }

            let transfer_args = ic_ledger_types::TransferArgs {
                memo: Memo(0),
                amount: Tokens::from_e8s(amount),
                fee: Tokens::from_e8s(10_000),
                from_subaccount: Some(principal_to_subaccount(&caller)),
                to: AccountIdentifier::new(&canister_id, &DEFAULT_SUBACCOUNT),
                created_at_time: None,
            };

            match ic_ledger_types::transfer(ledger_canister_id, transfer_args).await {
                Ok(_) => {
                    return Ok(Principal::from_text("jkies-sibbb-ap6").unwrap());
                },
                Err((code, msg)) => {
                    return Err(format!("Transfer balance error: {}: {}", code as u8, msg))
                }
            };
            
        },
        Err((code, msg)) => {
            return Err(format!("Account balance error: {}: {}", code as u8, msg))
        }
    }
}
