use ic_cdk::export::candid::{candid_method};
use ic_cdk::api::{call, caller, id};
// use ic_cdk::println;

use candid::{CandidType, Principal};

use serde::{Deserialize};

use std::cell::RefCell;
use std::collections::HashMap;

struct Asset { data: Vec<u8>, temp: Vec<u8> }

thread_local! {
	static STATE: RefCell<HashMap<String, Asset>> = RefCell::new(HashMap::new());
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

#[ic_cdk_macros::update(name = "create_batch")]
#[candid_method(update, rename = "create_batch")]
pub async fn create_batch(key: String) {
	STATE.with(|c| {
		(*c.borrow_mut()).insert(key.to_string(), Asset { data: vec![], temp: vec![] });
	});
}

#[ic_cdk_macros::update(name = "append_chunk")]
#[candid_method(update, rename = "append_chunk")]
pub async fn append_chunk(key: String, append_bytes: Vec<u8>) {
	STATE.with(|c| {
		let temp_bytes = match (*c.borrow()).get(&key) {
			Some(x) => x.temp.clone(),
			None => vec![]
		};
		let asset: Asset = Asset { data: vec![], temp: [temp_bytes.as_slice(), append_bytes.as_slice()].concat() };
		(*c.borrow_mut()).insert(key.to_string(), asset);
	});
}

#[ic_cdk_macros::update(name = "commit_batch")]
#[candid_method(update, rename = "commit_batch")]
pub async fn commit_batch(key: String) {
	STATE.with(|c| {
		let bytes = match (*c.borrow()).get(&key) {
			Some(x) => x.temp.clone(),
			None => vec![]
		};
		let asset: Asset = Asset { data: bytes, temp: vec![] };
		(*c.borrow_mut()).insert(key.to_string(), asset);
	});
}

#[ic_cdk_macros::update(name = "store_batch")]
#[candid_method(update, rename = "store_batch")]
pub async fn store_batch(key: String, append_bytes: Vec<u8>) {
	STATE.with(|c| {
		let asset: Asset = Asset { data: append_bytes, temp: vec![] };
		(*c.borrow_mut()).insert(key.to_string(), asset);
	});
}

fn _get_content_type(name: &str) -> String {
	if name.ends_with(".html") { return "text/html".to_string() }
	else if name.ends_with(".js") { return "text/javascript".to_string() }
	else if name.ends_with(".css") { return "text/css".to_string() } 
	else if name.ends_with(".txt") { return "text/plain".to_string() }
	else if name.ends_with(".md") { return "text/markdown".to_string() }
	else { return "application/octet-stream".to_string() }
}

#[ic_cdk_macros::update(name = "createChildCanister")]
#[candid_method(update, rename = "createChildCanister")]
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

	let wasm_bytes: Vec<u8> = STATE.with(|w| {
		let x = match (*w.borrow_mut()).get("wasm") {
			Some(w) => (&w.data).clone(),
			None => vec![]
		};
		x
	});
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

	let bundle_bytes: Vec<u8> = STATE.with(|w| {
		let x = match (*w.borrow_mut()).get("static/js/bundle.js") {
			Some(w) => (&w.data).clone(),
			None => vec![]
		};
		x
	});

	let canister_str = &create_result.canister_id.to_string();
	let bundle_str = String::from_utf8(bundle_bytes).expect("Invalid JS bundle");
	let bundle_with_env = bundle_str.replace("REACT_APP_BACKEND_CANISTER_ID", canister_str);

	let assets_bytes: Vec<u8> = STATE.with(|w| {
		let x = match (*w.borrow_mut()).get("frontend.assets") {
			Some(w) => (&w.data).clone(),
			None => vec![]
		};
		x
	});

	let assets_str = String::from_utf8(assets_bytes.clone()).expect("Invalid frontend.assets");
	let assets: Vec<serde_json::Value> = serde_json::from_str(&assets_str).expect("Invalid JSON");
	for asset in &assets {
		
		let asset_str = &asset.as_str().unwrap();		
		let asset_bytes: Vec<u8> = STATE.with(|w| {
			let x = match (*w.borrow_mut()).get(asset_str.clone()) {
				Some(w) => (&w.data).clone(),
				None => vec![]
			};
			x
		});

		let content = if asset_str == &"static/js/bundle.js" { bundle_with_env.as_bytes().to_vec() } else { asset_bytes };
		let store_args = StoreAssetArgs {
			key: ["/", asset_str.clone()].join(""),
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
