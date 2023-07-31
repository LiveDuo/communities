mod state;
mod utils;
mod create_child;

use sha2::{Digest, Sha256};

use candid::{CandidType, Deserialize, Principal, candid_method};
use ic_cdk_macros::{query, update, init};

use utils::*;
use create_child::*;
use crate::state::{STATE, *};

fn create_default_tracks() {

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let caller = ic_cdk::caller();
        // add stable track
        let stable_tract_id = uuid(&caller.to_text());
        let stable_track  = Track {name: "stable".to_owned()};
        state.tracks.insert(stable_tract_id, stable_track.to_owned());
        state.indexes.track.insert("stable".to_string(), stable_tract_id);
        
        // add beta track
        let beta_tract_id = uuid(&caller.to_text());
        let beta_track  = Track {name: "beta".to_owned()};
        state.tracks.insert(beta_tract_id, beta_track);
        state.indexes.track.insert("beta".to_string(), beta_tract_id);
    })
}

#[init]
#[candid_method(init)]
fn init() {
    ic_certified_assets::init();
    create_default_tracks();
}



#[update]
#[candid_method(update)]
async fn create_child() -> Result<Principal, String> {
    let id = ic_cdk::id();
    let caller = ic_cdk::caller();

    // check upgrade
    let upgrades_length = STATE.with(|s| s.borrow().upgrades.len());
    if upgrades_length == 0 {
        return Err("No upgrade available".to_owned())
    }

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
        let stable_track_id = state.indexes.track.get(&"stable".to_owned()).unwrap();
        let upgrades_id = state.relations.track_id_to_upgrade_id.forward.get(stable_track_id);
        let mut upgrades = upgrades_id.unwrap().iter().map(|(upgrade_id, _)| state.upgrades.get(upgrade_id).unwrap().to_owned()).collect::<Vec<_>>();
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


#[query]
#[candid_method(query)]
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

#[query]
#[candid_method(query)]
fn get_next_upgrades(wasm_hash: Vec<u8>) -> Vec<Upgrade> {
    STATE.with(|s| {
        let state = s.borrow();
        state.upgrades.iter().filter(|&(_, u)| u.upgrade_from == Some(wasm_hash.to_owned())).map(|(_, u)|u.to_owned()).collect::<Vec<_>>()
    })
}


#[query]
#[candid_method(query)]
fn get_upgrades() -> Vec<UpgradeResponse> {
    STATE.with(|s| {
        let state = s.borrow();
        state.upgrades.iter().map(|(id, u)|{
					let (track_id,_) = state.relations.track_id_to_upgrade_id.backward.get(id).unwrap().first_key_value().unwrap();
					let track  = state.tracks.get(track_id).unwrap();
					UpgradeResponse {
						version: u.version.to_owned(),
						upgrade_from: u.upgrade_from.to_owned(),
						timestamp: u.timestamp,
						wasm_hash: u.wasm_hash.to_owned(),
						assets: u.assets.to_owned(),
						track: track.name.to_owned()
					}
				}).collect::<Vec<_>>()
    })
}

#[query]
#[candid_method(query)]
fn get_upgrade(wasm_hash: Vec<u8>, track: String) -> Option<Upgrade> {
	STATE.with(|s| {
		let state = s.borrow();

		// get track upgrade by ids
		let track_id: &u64 = state.indexes.track.get(&track).unwrap();
		let track_upgrade_ids_opt = state.relations.track_id_to_upgrade_id.forward.get(track_id);
		if track_upgrade_ids_opt.is_none() {
			return None;
		}

		// get upgrades 
		let upgrade_opt = track_upgrade_ids_opt.unwrap().iter()
			.map(|(id, _)| state.upgrades.get(id).unwrap().to_owned())
			.find(|u|u.wasm_hash == wasm_hash);

		upgrade_opt
	})
}


#[update]
#[candid_method(update)]
async fn create_upgrade(version: String, upgrade_from: Option<Vec<u8>>, assets: Vec<String>, track: String) -> Result<(), String> {
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
        state.indexes.upgrade_from.insert(upgrade_from, upgrade_id);
        
        // add track relation
        let track_id = state.indexes.track.get(&track).unwrap().to_owned();
        state.relations.track_id_to_upgrade_id.insert(track_id, upgrade_id);
    });

    Ok(())
}


#[update]
#[candid_method(update)]
async fn remove_upgrade(version: String, track: String) -> Result<(), String> {
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
        let track_id = state.indexes.track.get(&track).unwrap().to_owned();
        state.relations.track_id_to_upgrade_id.remove(track_id, upgrade_id);

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

#[query]
#[candid_method(query)]
fn http_request(req: ic_certified_assets::types::HttpRequest) -> ic_certified_assets::types::HttpResponse {
    ic_certified_assets::http_request_handle(req)
}

#[test]
fn candid_interface_compatibility() {
    
    use candid::utils::*;
    use std::path::PathBuf;
    use ic_cdk::export::candid::export_service;
    
    export_service!();

    let new_interface = __export_service();
    let old_interface = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("parent.did");
    service_compatible(CandidSource::Text(&new_interface), CandidSource::File(old_interface.as_path())).unwrap();
}
