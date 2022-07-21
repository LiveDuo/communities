use ic_cdk::export::candid::{candid_method};
use ic_cdk::api::{call, caller, id};
// use ic_cdk::println;

use candid::{CandidType, Principal};

use serde::{Deserialize};

use std::cell::RefCell;
use std::collections::HashMap;


const FRONTEND_WASM: &[u8] = std::include_bytes!("../../canisters/http.wasm");
const BACKEND_WASM: &[u8] = std::include_bytes!("../../canisters/http.wasm");


thread_local! {
	static WASM: RefCell<Vec<u8>> = RefCell::new(Vec::new());
	static WASM_TEMP: RefCell<Vec<u8>> = RefCell::new(Vec::new());
}

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

#[ic_cdk_macros::update(name = "create_wasm_batch")]
#[candid_method(update, rename = "create_wasm_batch")]
pub async fn create_wasm_batch() {
	WASM_TEMP.with(|c| {
		*c.borrow_mut() = vec![]; // clean WASM_TEMP
	});
}

#[ic_cdk_macros::update(name = "append_wasm_chunk")]
#[candid_method(update, rename = "append_wasm_chunk")]
pub async fn append_wasm_chunk(mut bytes_str: Vec<u8>) {
	WASM_TEMP.with(|c| {
		(*c.borrow_mut()).append(&mut bytes_str); // append to WASM_TEMP
	});
	
}

#[ic_cdk_macros::update(name = "commit_wasm_batch")]
#[candid_method(update, rename = "commit_wasm_batch")]
pub async fn commit_wasm_batch() {
	WASM_TEMP.with(|c| {
		WASM.with(|j| *j.borrow_mut() = (*c.borrow_mut()).clone()); // copy WASM_TEMP to WASM
		*c.borrow_mut() = vec![]; // clean WASM_TEMP
	});
}

#[ic_cdk_macros::update(name = "createBackendCanister")]
#[candid_method(update, rename = "createBackendCanister")]
pub async fn create_backend_canister() -> Result<Principal, String> {

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

	let wasm_bytes: Vec<u8> = WASM.with(|w| w.borrow_mut().clone());
	// println!("Bytes {:?}", wasm_bytes.clone());


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

	Ok(create_result.canister_id)
}


#[ic_cdk_macros::update(name = "createFrontendCanister")]
#[candid_method(update, rename = "createFrontendCanister")]
pub async fn create_frontend_canister() -> Result<Principal, String> {

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
		wasm_module: BACKEND_WASM.to_vec(),
		arg: b" ".to_vec(),
	};
	
	match call::call(Principal::management_canister(), "install_code", (install_args,),).await {
		Ok(x) => x,
		Err((code, msg)) => { return Err(format!("Install code error: {}: {}", code as u8, msg)) }
	}

	// node -e "console.log('<html><body><b>Welcome</b></body></html>\n'.split('').map(r => r.charCodeAt(0)).join(', '))"
	// let content = vec![60, 104, 116, 109, 108, 62, 60, 98, 111, 100, 121, 62, 60, 98, 62, 87, 101, 108, 99, 111, 109, 101, 60, 47, 98, 62, 60, 47, 98, 111, 100, 121, 62, 60, 47, 104, 116, 109, 108, 62, 10];
	// let store_args = StoreAssetArgs {
	// 	key: "/index.html".to_owned(),
	// 	content_type: "text/html".to_owned(),
	// 	content_encoding: "identity".to_owned(),
	// 	content: content,
	// };

	// match call::call(create_result.canister_id, "store", (store_args,),).await {
	// 	Ok(x) => x,
	// 	Err((code, msg)) => { return Err(format!("Store asset error: {}: {}", code as u8, msg)) }
	// }

	Ok(create_result.canister_id)
}
