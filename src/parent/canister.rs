use ic_cdk::export::candid::{candid_method};
use ic_cdk::api::{call, caller, id};

use candid::{CandidType, Principal};

use serde::{Deserialize};

const GIT_WASM: &[u8] = std::include_bytes!("../../canisters/http.wasm");
const CHILD_WASM: &[u8] = std::include_bytes!("../../canisters/child.wasm");

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

#[ic_cdk_macros::update(name = "create_git_canister")]
#[candid_method(update, rename = "create_git_canister")]
pub async fn create_git_canister() -> Result<Principal, String> {

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

	let install_args = InstallCanisterArgs {
		mode: InstallMode::Install,
		canister_id: create_result.canister_id,
		wasm_module: GIT_WASM.to_vec(),
		arg: b" ".to_vec(),
	};
	
	match call::call(Principal::management_canister(), "install_code", (install_args,),).await {
		Ok(x) => x,
		Err((code, msg)) => { return Err(format!("Install code error: {}: {}", code as u8, msg)) }
	}

	Ok(create_result.canister_id)
}


#[ic_cdk_macros::update(name = "create_child_canister")]
#[candid_method(update, rename = "create_child_canister")]
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

	let install_args = InstallCanisterArgs {
		mode: InstallMode::Install,
		canister_id: create_result.canister_id,
		wasm_module: CHILD_WASM.to_vec(),
		arg: b" ".to_vec(),
	};
	
	match call::call(Principal::management_canister(), "install_code", (install_args,),).await {
		Ok(x) => x,
		Err((code, msg)) => { return Err(format!("Install code error: {}: {}", code as u8, msg)) }
	}

	// node -e "console.log('<html><body><b>Welcome</b></body></html>\n'.split('').map(r => r.charCodeAt(0)).join(', '))"
	let content = vec![60, 104, 116, 109, 108, 62, 60, 98, 111, 100, 121, 62, 60, 98, 62, 87, 101, 108, 99, 111, 109, 101, 60, 47, 98, 62, 60, 47, 98, 111, 100, 121, 62, 60, 47, 104, 116, 109, 108, 62, 10];
	let store_args = StoreAssetArgs {
		key: "/index.html".to_owned(),
		content_type: "text/html".to_owned(),
		content_encoding: "identity".to_owned(),
		content: content,
	};

	match call::call(create_result.canister_id, "store", (store_args,),).await {
		Ok(x) => x,
		Err((code, msg)) => { return Err(format!("Store asset error: {}: {}", code as u8, msg)) }
	}

	Ok(create_result.canister_id)
}
