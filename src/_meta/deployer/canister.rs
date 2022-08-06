use ic_cdk::{export::candid::candid_method, api};
use ic_cdk_macros::{init, query, update};

use candid::{CandidType, Principal};

use serde::{Deserialize};

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

#[derive(CandidType)]
struct CreateCanisterArgs { settings: CreateCanisterSettings, }

#[derive(CandidType, Deserialize)]
struct CreateCanisterResult { canister_id: Principal, }

#[init]
fn init() {
    ic_certified_assets::init();
}

#[update]
#[candid_method(update)]
pub async fn create_child_canister() -> Result<Principal, String> {

	let canister_id = ic_cdk::api::id();
	let caller = ic_cdk::caller();

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
