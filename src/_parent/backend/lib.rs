use ic_cdk::export::candid::export_service;

mod state;
use sha2::{Digest, Sha256};

use candid::{CandidType, Deserialize, Principal};

use crate::state::{STATE, *};

mod utils;
use utils::{get_asset, uuid, store_assets, authorize};

mod create_child;
use create_child::{create_canister, install_code, set_canister_controllers, mint_cycles};
use create_child::LEDGER_CANISTER;

#[ic_cdk_macros::init]
fn init() {
    ic_certified_assets::init();
}
// create child
#[ic_cdk_macros::update]
async fn create_child() -> Result<Principal, String> {
    let id = ic_cdk::id();
    let caller = ic_cdk::caller();

    // mint cycles
    let result = ic_cdk::api::call::call::<_, (Result<u64, String>,)>(id, "create_canister_data_callback", (caller,)).await;
    let (canister_data_id_opt,) = result.unwrap();
    let canister_data_id = canister_data_id_opt.unwrap();

    if LEDGER_CANISTER != None {
        mint_cycles(caller, id).await.unwrap();
    }

    // create canister
    let canister_id = create_canister(id).await.unwrap();
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let user_data = state.canister_data.get_mut(&canister_data_id).unwrap();
        user_data.id = Some(canister_id)
    });

    // get latest version
    let version = STATE.with(|s| {
        let state = s.borrow();
        let mut upgrades = state.upgrades.iter().map(|(_, u)| u.to_owned()).collect::<Vec<_>>();
        upgrades.sort_by(|a, b| b.version.cmp(&a.version));
        upgrades.first().unwrap().to_owned()
    });

    // install wasm code
    ic_cdk::spawn(async move {ic_cdk::api::call::call::<_, (Result<(), String>,)>(id, "update_canister_state_callback", (canister_data_id, CanisterState::Installing,)).await.unwrap().0.unwrap();});
    install_code(canister_id, &version.version, &caller).await.unwrap();

    // upload frontend assets
    ic_cdk::spawn(async move {ic_cdk::api::call::call::<_, (Result<(), String>,)>(id, "update_canister_state_callback", (canister_data_id, CanisterState::Uploading,)).await.unwrap().0.unwrap();});
    store_assets(canister_id, &version.assets, &version.version).await.unwrap();

    // set controllers
    ic_cdk::spawn(async move {ic_cdk::api::call::call::<_, (Result<(), String>,)>(id, "update_canister_state_callback", (canister_data_id, CanisterState::Authorizing, )).await.unwrap().0.unwrap();});
    ic_cdk::spawn(async move {ic_cdk::api::call::call::<_, ()>(canister_id, "authorize", (canister_id,)).await.unwrap();});
    set_canister_controllers(canister_id, caller).await.unwrap();

    // mark as done
    ic_cdk::spawn(async move {ic_cdk::api::call::call::<_, (Result<(), String>,)>(id, "update_canister_state_callback", (canister_data_id, CanisterState::Ready,)).await.unwrap().0.unwrap();});
    Ok(canister_id)
}

#[ic_cdk_macros::update]
fn update_canister_state_callback(canister_data_id: u64, canister_state: CanisterState) -> Result<(), String> {
    if ic_cdk::caller() != ic_cdk::id() {
        return Err("Unauthorized".to_owned());
    };
    
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let user_data = state
            .canister_data
            .get_mut(&canister_data_id)
            .unwrap();
        user_data.state = canister_state;
    });

    Ok(())
}

#[ic_cdk_macros::update]
fn create_canister_data_callback(caller: Principal) -> Result<u64, String> {
    if ic_cdk::caller() != ic_cdk::id() {
        return Err("Unauthorized".to_owned());
    };

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

        Ok(canister_data_id)
    })
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

#[ic_cdk_macros::query]
fn get_children() ->  Vec<Principal>{
    STATE.with(|s| s.borrow().canister_data.iter().map(|(_, canister_data)| canister_data.id.unwrap()).collect::<Vec<_>>())
}

// upgrade
#[ic_cdk_macros::query]
fn get_next_upgrade(wasm_hash: Vec<u8>) -> Option<Upgrade> {
    STATE.with(|s| {
        let state = s.borrow();
        let upgrade_id_opt = state.indexes.upgrade_from.get(&Some(wasm_hash.to_owned()));
        if upgrade_id_opt == None {
            return  None;
        }
        state.upgrades.get(upgrade_id_opt.unwrap()).cloned()
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
        let upgrade_id_opt = state.indexes.wasm_hash.get(&wasm_hash);
        if upgrade_id_opt == None {
            return None;
        }
        state.upgrades.get(upgrade_id_opt.unwrap()).cloned()
    })
}

#[ic_cdk_macros::update]
async fn create_upgrade(version: String, upgrade_from: Option<Vec<u8>>, assets: Vec<String>,) -> Result<(), String> {
    // authorize
    let caller = ic_cdk::caller();
    authorize(&caller).await?;

    // get wasm
    let wasm_key = format!("/upgrade/{}/child.wasm", version);
    let wasm = get_asset(wasm_key);

    // get wasm hash
    let mut wasm_hash_hasher = Sha256::new();
    wasm_hash_hasher.update(wasm.clone());
    let wasm_hash = wasm_hash_hasher.finalize()[..].to_vec();

    // check if version exists
    let index_wasm_hash = STATE.with(|s| s.borrow().indexes.wasm_hash.to_owned());
    if index_wasm_hash.contains_key(&wasm_hash) {
        return Err("Version already exists".to_owned());
    }

    // check if assets exists
    for asset in &assets {
        if !ic_certified_assets::exists(asset.to_owned()) {
            return Err(format!("The {} does not exist", asset));
        }
    }
    // insert to state
    let upgrade = Upgrade {
        version: version.to_owned(),
        upgrade_from: upgrade_from.to_owned(),
        timestamp: ic_cdk::api::time(),
        wasm_hash: wasm_hash.to_owned(),
        assets: assets.clone(),
    };
    let upgrade_id = uuid(&caller.to_text());
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.upgrades.insert(upgrade_id, upgrade);
        state.indexes.version.insert(version, upgrade_id);
        state.indexes.wasm_hash.insert(wasm_hash, upgrade_id);
        state.indexes.upgrade_from.insert(upgrade_from, upgrade_id)
    });

    Ok(())
}

#[ic_cdk_macros::update]
async fn remove_upgrade(version: String) -> Result<(), String> {
    let caller = ic_cdk::caller();
    authorize(&caller).await?;

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let upgrade_id_opt = state.indexes.version.get(&version).cloned();
        if upgrade_id_opt == None {
            return Err("Version does not exist".to_owned()); 
        }

        let upgrade_id= upgrade_id_opt.unwrap();
        let upgrade = state.upgrades.get(&upgrade_id).cloned().unwrap();
        state.indexes.version.remove(&upgrade.version);
        state.indexes.wasm_hash.remove(&upgrade.wasm_hash);
        state.indexes.upgrade_from.remove(&upgrade.upgrade_from);
        state.upgrades.remove(&upgrade_id);

        Ok(())
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
fn http_request(req: ic_certified_assets::types::HttpRequest) -> ic_certified_assets::types::HttpResponse {
    ic_certified_assets::http_request_handle(req)
}

export_service!();

#[ic_cdk_macros::query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
    __export_service()
}
