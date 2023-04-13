use ic_cdk::api::call::CallResult;
use ic_cdk::export::candid::{export_service};

mod state;

use candid::{CandidType, Deserialize, Principal};

use crate::state::principal_to_subaccount;

use crate::state::{*, STATE};

use include_macros::{get_canister};

pub const PAYMENT_AMOUNT: u64 = 100_000_000; // 1 ICP
pub const TRANSFER_FEE: u64 = 10_000;

static LEDGER_CANISTER: Option<Principal> = get_canister!("ledger");
// static CMC_CANISTER: Option<Principal> = get_canister!("cmc");

#[ic_cdk_macros::init]
fn init() {
    ic_certified_assets::init();
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
	let balance_result: Result<(Tokens,), _> = ic_cdk::call(LEDGER_CANISTER.unwrap(), "account_balance", (account_balance_args,),)
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
        ic_cdk::call(LEDGER_CANISTER.unwrap(), "transfer", (transfer_args,))
            .await
            .map_err(|(code, msg)| format!("Transfer error: {}: {}", code as u8, msg))
            .unwrap();

	Ok(())
}

#[ic_cdk_macros::update]
pub async fn create_child() -> Result<Principal, String> {

	let id = ic_cdk::api::id();
	let caller = ic_cdk::caller();


	// mint cycles
	let arg0 = CallbackData { canister_index: 0, user: caller, state: CanisterState::Preparing };
	let result = ic_cdk::api::call::call(id, "update_state_callback", (arg0, )).await as CallResult<(Option<usize>,)>;
	let canister_index_opt = result.unwrap();
	let canister_index = canister_index_opt.0.unwrap();

	if LEDGER_CANISTER != None {
		mint_cycles(caller, id).await.unwrap();
	}

	// create canister
	let canister_id = create_canister(caller, id).await.unwrap();
	update_user_canister_id(caller, canister_index, canister_id.to_string());

	// install wasm code
	let arg2 = CallbackData { canister_index, user: caller, state: CanisterState::Installing };
	let _ = ic_cdk::api::call::call(id, "update_state_callback", (arg2, )).await as CallResult<(Option<usize>,)>;
	install_code(caller, canister_id).await.unwrap();

	// upload frontend assets
	let arg3 = CallbackData { canister_index, user: caller, state: CanisterState::Uploading };
	let _ = ic_cdk::api::call::call(id, "update_state_callback", (arg3, )).await as CallResult<(Option<usize>,)>;
	store_assets(canister_id).await.unwrap();

	// mark as done
	let arg4 = CallbackData { canister_index, user: caller, state: CanisterState::Ready };
	let _ = ic_cdk::api::call::call(id, "update_state_callback", (arg4, )).await as CallResult<(Option<usize>,)>;
	Ok(canister_id)
}

fn create_user_canister(caller: Principal) -> usize {
	let data = CanisterData { id: None, timestamp: ic_cdk::api::time(), state: CanisterState::Preparing};
	let index = STATE.with(|s| {
		let mut state = s.borrow_mut();
		let user_opt = state.canister_data.get(&caller.to_string());
		match user_opt {
			Some(user_data) => { // user exists
				let canisters = if user_data.len() > 0 { user_data.clone() } else { vec![] };
				state.canister_data.insert(caller.to_string(), [canisters.clone(), vec![data]].concat());
				return canisters.len();
			}
			None => { // user first canister
				state.canister_data.insert(caller.to_string(), vec![data]);
				return 0;
			}
		}
	});
	return index;
}

// canister_index: usize
#[ic_cdk_macros::update]
fn update_state_callback(data: CallbackData) -> Option<usize> {

	let caller = ic_cdk::caller();

	if caller != ic_cdk::id() { return None };

	// ic_cdk::println!("Calling update save {:?}", data.state);
	
	let mut index_opt = None;
	if data.state == CanisterState::Preparing {
		index_opt = Some(create_user_canister(data.user));
	}

	update_user_canister_state(data.user, data.canister_index, data.state);

	return index_opt;
}

fn update_user_canister_state(caller: Principal, index: usize, canister_state: CanisterState) {
	STATE.with(|s| {
		let mut state = s.borrow_mut();
		let user_data = state.canister_data.get_mut(&caller.to_string()).unwrap();
		user_data.get_mut(index).unwrap().state = canister_state;
	});
}

fn update_user_canister_id(caller: Principal, index: usize, canister_id: String) {
	STATE.with(|s| {
		let mut state = s.borrow_mut();
		let user_data = state.canister_data.get_mut(&caller.to_string()).unwrap();
		user_data.get_mut(index).unwrap().id = Some(canister_id);
	});
}

#[ic_cdk_macros::query]
fn get_upgrade(_version: String) -> Vec<u8> {
	let wasm_bytes: Vec<u8> = ic_certified_assets::get_asset("/child/child.wasm".to_string());
	return wasm_bytes;
}

// dfx canister call parent get_user_canisters
#[ic_cdk_macros::query]
fn get_user_canisters() -> Vec<CanisterData> {
	let caller = ic_cdk::caller();
	let data = STATE.with(|s| { return s.borrow().canister_data.clone(); });
	return data.get(&caller.to_string()).unwrap_or(&Vec::new() as &Vec<CanisterData>).to_vec();
}

#[derive(CandidType, Deserialize)]
pub struct UpgradeState {
  pub lib: State,
  pub assets: ic_certified_assets::StableState,
}

#[ic_cdk_macros::pre_upgrade]
fn pre_upgrade() {
	
	let lib = STATE.with(|s|{ s.clone().into_inner() });
    let assets = ic_certified_assets::pre_upgrade();

    let state = UpgradeState { lib, assets };
	ic_cdk::storage::stable_save((state,)).unwrap();
}

#[ic_cdk_macros::post_upgrade]
fn post_upgrade() {
	
	let (s_prev,): (UpgradeState,) = ic_cdk::storage::stable_restore().unwrap();

    STATE.with(|s|{ *s.borrow_mut() = s_prev.lib.to_owned(); });
    ic_certified_assets::post_upgrade(s_prev.assets);
	
}

#[ic_cdk_macros::query]
fn http_request(req: ic_certified_assets::types::HttpRequest) -> ic_certified_assets::types::HttpResponse {
	return ic_certified_assets::http_request_handle(req);
}

export_service!();

#[ic_cdk_macros::query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
  __export_service()
}
