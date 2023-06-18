use ic_cdk::export::candid::export_service;

mod state;
use sha2::{Digest, Sha256};

use candid::{CandidType, Deserialize, Encode, Principal};

use crate::state::principal_to_subaccount;

use crate::state::{STATE, *};
use ic_cdk_main::api::management_canister::main::*;
use ic_cdk_main::export::candid::Principal as PrincipalMain;
use include_macros::get_canister;

use std::collections::hash_map;
use std::hash::Hash;
use std::hash::Hasher;

pub const PAYMENT_AMOUNT: u64 = 100_000_000; // 1 ICP
pub const TRANSFER_FEE: u64 = 10_000;

static LEDGER_CANISTER: Option<Principal> = get_canister!("ledger");
// static CMC_CANISTER: Option<Principal> = get_canister!("cmc");

fn uuid(seed: &str) -> u64 {
    let timestamp: u64 = ic_cdk::api::time() * 1000 * 1000;
    let str = format!("{}-{}", seed, timestamp);
    let mut s = hash_map::DefaultHasher::new();
    str.hash(&mut s);
    s.finish()
}

#[ic_cdk_macros::init]
fn init() {
    ic_certified_assets::init();
}

fn get_content_type(name: &str) -> String {
    if name.ends_with(".html") {
        return "text/html".to_string();
    } else if name.ends_with(".js") {
        return "text/javascript".to_string();
    } else if name.ends_with(".css") {
        return "text/css".to_string();
    } else if name.ends_with(".txt") {
        return "text/plain".to_string();
    } else if name.ends_with(".md") {
        return "text/markdown".to_string();
    } else {
        return "application/octet-stream".to_string();
    }
}

async fn store_assets(
    canister_id: Principal,
    assets: &Vec<String>,
    version: &String,
) -> Result<(), String> {
    for asset in assets {
        // skip unnecessary files
        if asset == &format!("/upgrade/{}/child.wasm", version) {
            continue;
        }

        // get asset content
        let asset_bytes: Vec<u8> = ic_certified_assets::get_asset(asset.to_owned());
        let content;
        if asset == &format!("/upgrade/{}/static/js/bundle.js", version) {
            let bundle_str = String::from_utf8(asset_bytes).expect("Invalid JS bundle");
            let bundle_with_env =
                bundle_str.replace("REACT_APP_CHILD_CANISTER_ID", &canister_id.to_string());
            content = bundle_with_env.as_bytes().to_vec();
        } else {
            content = asset_bytes;
        }

        // upload asset
        let key = asset.replace(&format!("/upgrade/{}", version), "");
        let store_args = StoreAssetArgs {
            key: key.to_owned(),
            content_type: get_content_type(&key),
            content_encoding: "identity".to_owned(),
            content,
        };
        let result: Result<((),), _> =
            ic_cdk::api::call::call(canister_id, "store", (store_args,)).await;
        match result {
            Ok(_) => {}
            Err((code, msg)) => return Err(format!("Upload asset error: {}: {}", code as u8, msg)),
        }
    }

    Ok(())
}

async fn install_code(canister_id: PrincipalMain, version: &String) -> Result<(), String> {
    // get wasm
    let wasm_bytes: Vec<u8> =
        ic_certified_assets::get_asset(format!("/upgrade/{}/child.wasm", version).to_string());
    if wasm_bytes.is_empty() {
        return Err(format!("WASM not found"));
    }

    // get wasm hash
    let mut hasher = Sha256::new();
    hasher.update(wasm_bytes.clone());
    let wasm_hash = hasher.finalize()[..].to_vec();

    // install canister code
    let install_args = InstallCodeArgument {
        mode: CanisterInstallMode::Install,
        canister_id: canister_id,
        wasm_module: wasm_bytes,
        arg: Encode!(&Some(wasm_hash)).unwrap(),
    };

    let (result,) = ic_cdk_main::call::<_, ((),)>(
        PrincipalMain::management_canister(),
        "install_code",
        (install_args,),
    )
    .await
    .map_err(|(code, msg)| format!("Install code error: {}: {}", code as u8, msg))
    .unwrap();

    Ok(result)
}

async fn create_canister(canister_id: Principal) -> Result<PrincipalMain, String> {
    let convert_to_principal_mail = PrincipalMain::from_text(canister_id.to_text()).unwrap();
    let canister_setting = CanisterSettings {
        controllers: Some(vec![convert_to_principal_mail]),
        compute_allocation: None,
        memory_allocation: None,
        freezing_threshold: None,
    };
    let create_args = CreateCanisterArgument {
        settings: Some(canister_setting),
    };

    let (create_result,) = ic_cdk_main::api::call::call_with_payment::<_, (CanisterIdRecord,)>(
        PrincipalMain::management_canister(),
        "create_canister",
        (create_args,),
        200_000_000_000,
    )
    .await
    .map_err(|(code, msg)| format!("Create canister error: {}: {}", code as u8, msg))
    .unwrap();
    Ok(create_result.canister_id)
}

async fn mint_cycles(caller: Principal, canister_id: Principal) -> Result<(), String> {
    let account = AccountIdentifier::new(&canister_id, &principal_to_subaccount(&caller));

    let account_balance_args = AccountBalanceArgs { account: account };
    let balance_result: Result<(Tokens,), _> = ic_cdk::call(
        LEDGER_CANISTER.unwrap(),
        "account_balance",
        (account_balance_args,),
    )
    .await;

    let tokens: Tokens = match balance_result {
        Ok(x) => x.0,
        Err((code, msg)) => return Err(format!("Account balance error: {}: {}", code as u8, msg)),
    };

    if tokens.e8s < PAYMENT_AMOUNT {
        return Err(format!("Insufficient balance"));
    }

    let default_subaccount = Subaccount([0; 32]);

    let transfer_args = TransferArgs {
        memo: Memo(1347768404),
        amount: Tokens {
            e8s: PAYMENT_AMOUNT,
        },
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

async fn set_canister_controllers(
    child_canister_id: PrincipalMain,
    caller: Principal,
) -> Result<(), String> {
    let convert_caller = PrincipalMain::from_text(caller.to_text()).unwrap();
    let update_settings_args = UpdateSettingsArgument {
        canister_id: child_canister_id,
        settings: CanisterSettings {
            controllers: Some(vec![child_canister_id, convert_caller]),
            compute_allocation: None,
            memory_allocation: None,
            freezing_threshold: None,
        },
    };

    let _result = ic_cdk_main::call::<_, ((),)>(
        PrincipalMain::management_canister(),
        "update_settings",
        (update_settings_args,),
    )
    .await
    .map_err(|(code, msg)| format!("Update settings: {}: {}", code as u8, msg))
    .unwrap();

    Ok(())
}

#[ic_cdk_macros::update]
pub async fn create_child() -> Result<Principal, String> {
    let id = ic_cdk::id();
    let caller = ic_cdk::caller();

    // mint cycles
    let arg0 = CallbackData {
        canister_data_id: None,
        user: caller,
        state: CanisterState::Preparing,
    };
    let result =
        ic_cdk::api::call::call::<_, (Option<u64>,)>(id, "update_state_callback", (arg0,)).await;
    let (canister_data_id_opt,) = result.unwrap();
    let canister_data_id = canister_data_id_opt.unwrap();

    if LEDGER_CANISTER != None {
        mint_cycles(caller, id).await.unwrap();
    }

    // create canister
    let canister_id = create_canister(id).await.unwrap();
    let convert_canister_id = Principal::from_text(canister_id.to_text()).unwrap();
    update_user_canister_id(canister_data_id, convert_canister_id);

    // get leasts version
    let version = STATE.with(|s| {
        let state = s.borrow();
        let mut upgrades = state.upgrades.iter().map(|(_, u)| u.to_owned()).collect::<Vec<_>>();
        upgrades.sort_by(|a, b| b.version.cmp(&a.version));
        upgrades.first().unwrap().to_owned()
    });

    // install wasm code
    let arg2 = CallbackData {
        canister_data_id: Some(canister_data_id),
        user: caller,
        state: CanisterState::Installing,
    };
    let _ =
        ic_cdk::api::call::call::<_, (Option<u64>,)>(id, "update_state_callback", (arg2,)).await;
    install_code(canister_id, &version.version).await.unwrap();

    // upload frontend assets
    let arg3 = CallbackData {
        canister_data_id: Some(canister_data_id),
        user: caller,
        state: CanisterState::Uploading,
    };
    let _ =
        ic_cdk::api::call::call::<_, (Option<u64>,)>(id, "update_state_callback", (arg3,)).await;

    let convert_canister_id = Principal::from_text(canister_id.to_text()).unwrap();
    store_assets(convert_canister_id, &version.assets, &version.version)
        .await
        .unwrap();

    // mark as done
    let arg4 = CallbackData {
        canister_data_id: Some(canister_data_id),
        user: caller,
        state: CanisterState::Ready,
    };
    let _ =
        ic_cdk::api::call::call::<_, (Option<u64>,)>(id, "update_state_callback", (arg4,)).await;

    let _ = ic_cdk_main::api::call::call::<_, ()>(canister_id, "authorize", (canister_id,)).await;

    set_canister_controllers(canister_id, caller).await.unwrap();
    Ok(convert_canister_id)
}

fn create_user_canister(caller: Principal) -> u64 {
    STATE.with(|s| {
        let mut state = s.borrow_mut();

        let user_opt = state.indexes.active_principal.get(&caller);
        let user_id = if user_opt != None {
            *user_opt.unwrap()
        } else {
            let user_id = uuid(&caller.to_text());
            let profile = Profile {
                authentication: Authentication::Ic,
                active_principal: caller,
            };
            state.profiles.insert(user_id, profile);
            state.indexes.active_principal.insert(caller, user_id);
            user_id
        };

        let canister_data_id = uuid(&caller.to_text());

        state
            .canister_data
            .insert(canister_data_id, CanisterData::default());

        state
            .relations
            .profile_id_to_canister_id
            .insert(user_id, canister_data_id);

        canister_data_id
    })
}

// canister_index: usize
#[ic_cdk_macros::update]
fn update_state_callback(data: CallbackData) -> Option<u64> {
    let caller = ic_cdk::caller();

    if caller != ic_cdk::id() {
        return None;
    };
    let mut d = data.clone();
    if data.canister_data_id == None {
        d.canister_data_id = Some(create_user_canister(data.user));
    }

    update_user_canister_state(d.canister_data_id, d.state);

    return d.canister_data_id;
}

fn update_user_canister_state(canister_data_id: Option<u64>, canister_state: CanisterState) {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let user_data = state
            .canister_data
            .get_mut(&canister_data_id.unwrap())
            .unwrap();
        user_data.state = canister_state;
    });
}

fn update_user_canister_id(canister_data_id: u64, canister_id: Principal) {
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let user_data = state.canister_data.get_mut(&canister_data_id).unwrap();
        user_data.id = Some(canister_id)
    });
}

#[ic_cdk_macros::query]
fn get_next_upgrade(wasm_hash: Vec<u8>) -> Option<Upgrade> {
    STATE.with(|s| {
        let state = s.borrow();
        state.upgrades.iter().find(|(_, u)| u.upgrade_from == Some(wasm_hash.to_owned())).map(|(_, u)| u.to_owned())
    })
}
#[ic_cdk_macros::query]
fn get_upgrades() -> Vec<Upgrade> {
    STATE.with(|s| {
        let state = s.borrow();
        state.upgrades.iter().map(|(_, u)|u.to_owned()).collect::<Vec<_>>()
    })
}

#[ic_cdk_macros::query]
fn get_upgrade(wasm_hash: Vec<u8>) -> Option<Upgrade> {
    STATE.with(|s| {
        let state = s.borrow();
        state.upgrades.iter().find(|(_, u)| u.wasm_hash == wasm_hash).map(|(_, u)| u.to_owned())
    })
}

async fn authorize(caller: &PrincipalMain) -> Result<(), String> {
    let canister_id = ic_cdk_main::id();

    let args = CanisterIdRecord { canister_id };

    let (canister_status,) = ic_cdk_main::call::<_, (CanisterStatusResponse,)>(
        PrincipalMain::management_canister(),
        "canister_status",
        (args,),
    )
    .await
    .map_err(|(code, msg)| format!("Canister status {}: {}", code as u8, msg))
    .unwrap();

    if canister_status
        .settings
        .controllers
        .iter()
        .any(|c| c == caller)
    {
        Ok(())
    } else {
        Err("Caller is not a controller".to_owned())
    }
}

#[ic_cdk_macros::update]
async fn create_upgrade(
    version: String,
    upgrade_from: Option<Vec<u8>>,
    assets: Vec<String>,
) -> Result<(), String> {
    // authorize
    let caller = ic_cdk_main::caller();
    authorize(&caller).await?;

    // get wasm
    let wasm_key = format!("/upgrade/{}/child.wasm", version);
    let wasm = ic_certified_assets::get_asset(wasm_key);

    // get wasm hash
    let mut wasm_hash_hasher = Sha256::new();
    wasm_hash_hasher.update(wasm.clone());
    let wasm_hash = wasm_hash_hasher.finalize()[..].to_vec();

    // check if version exists
    let upgrades = STATE.with(|s| s.borrow().upgrades.to_owned());
    if upgrades.iter().any(|(_, upgrade)| upgrade.wasm_hash == wasm_hash) {
        return Err("Version already exists".to_owned());
    }

    // check if assets exists
    for asset in &assets {
        if !ic_certified_assets::exists(&asset) {
            return Err(format!("The {} does not exist", asset));
        }
    }

    // push to state
    let upgrade = Upgrade {
        version,
        upgrade_from,
        timestamp: ic_cdk::api::time(),
        wasm_hash,
        assets: assets.clone(),
    };
    let upgrade_id = uuid(&caller.to_text());
    STATE.with(|s| s.borrow_mut().upgrades.insert(upgrade_id, upgrade));

    Ok(())
}
#[ic_cdk_macros::update]
async fn remove_upgrade(version: String) -> Result<(), String> {
    let caller = ic_cdk_main::caller();
    authorize(&caller).await?;



    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let upgrade_id= state
            .upgrades
            .iter()
            .find(|(_, u)| u.version == version)
            .map(|(id, _)| id.to_owned())
            .unwrap();
        state.upgrades.remove(&upgrade_id);
    });

    Ok(())
}

#[ic_cdk_macros::query]
fn get_user_canisters() -> Vec<CanisterData> {
    let caller = ic_cdk::caller();
    STATE.with(|s| {
        let state = s.borrow();
        let profile_id_opt = state.indexes.active_principal.get(&caller);

        if profile_id_opt == None {
            return vec![];
        }

        let profile_id = profile_id_opt.unwrap();

        let canister_data_ids_opt = state
            .relations
            .profile_id_to_canister_id
            .forward
            .get(profile_id);
        if canister_data_ids_opt == None {
            return vec![];
        }

        let canister_data_ids = canister_data_ids_opt.unwrap();
        let canisters_data = canister_data_ids
            .iter()
            .map(|f| state.canister_data.get(f.0).unwrap().clone())
            .collect::<Vec<_>>();
        canisters_data
    })
}

#[derive(CandidType, Deserialize)]
pub struct UpgradeState {
    pub lib: State,
    pub assets: ic_certified_assets::StableState,
}

#[ic_cdk_macros::pre_upgrade]
fn pre_upgrade() {
    let lib = STATE.with(|s| s.clone().into_inner());
    let assets = ic_certified_assets::pre_upgrade();

    let state = UpgradeState { lib, assets };
    ic_cdk::storage::stable_save((state,)).unwrap();
}

#[ic_cdk_macros::post_upgrade]
fn post_upgrade() {
    let (s_prev,): (UpgradeState,) = ic_cdk::storage::stable_restore().unwrap();

    STATE.with(|s| {
        *s.borrow_mut() = s_prev.lib.to_owned();
    });
    ic_certified_assets::post_upgrade(s_prev.assets);
}

#[ic_cdk_macros::query]
fn http_request(
    req: ic_certified_assets::types::HttpRequest,
) -> ic_certified_assets::types::HttpResponse {
    return ic_certified_assets::http_request_handle(req);
}

export_service!();

#[ic_cdk_macros::query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
    __export_service()
}
