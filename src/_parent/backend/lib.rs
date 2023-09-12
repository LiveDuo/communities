mod state;
mod assets;
mod create_child;

use candid::{CandidType, Deserialize, Principal, candid_method};
use ic_cdk_macros::{query, update, init};
use ic_cdk::api::management_canister::main::{CanisterIdRecord, CanisterStatusResponse};

// use assets::*;
use create_child::*;
use crate::state::{STATE, *};
use candid::{Decode, Encode};

const DEFAULT_TRACK: &str = "default";
#[init]
#[candid_method(init)]
fn init() {
    ic_certified_assets::init();
    add_track(DEFAULT_TRACK.to_owned(), ic_cdk::caller()).unwrap();
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
    let canister_data_id = uuid(&caller.to_text());
    ic_cdk::spawn(async move {ic_cdk::api::call::call::<_, (Result<u64, String>,)>(id, "create_canister_data_callback", (caller, canister_data_id)).await.unwrap().0.unwrap();});

    if LEDGER_CANISTER.is_some() && CMC_CANISTER.is_some() {
        mint_cycles(caller, id).await.unwrap();
    }

    // create canister
    let canister_id = create_canister(id).await.unwrap();
    ic_cdk::spawn(async move {ic_cdk::api::call::call::<_, (Result<(), String>,)>(id, "update_canister_id_callback", (canister_data_id, canister_id)).await.unwrap().0.unwrap();});
    
    // get latest version
    let version = get_latest_version();

    // install wasm code
    ic_cdk::spawn(async move {ic_cdk::api::call::call::<_, (Result<(), String>,)>(id, "update_canister_state_callback", (canister_data_id, CanisterState::Installing,)).await.unwrap().0.unwrap();});
    install_code(canister_id, &version.track, &version.version, &caller).await.unwrap();

    // upload frontend assets
    ic_cdk::spawn(async move {ic_cdk::api::call::call::<_, (Result<(), String>,)>(id, "update_canister_state_callback", (canister_data_id, CanisterState::Uploading,)).await.unwrap().0.unwrap();});
    store_assets(canister_id, &version.assets, &version.version, &version.track).await.unwrap();

    // set controllers
    ic_cdk::spawn(async move {ic_cdk::api::call::call::<_, (Result<(), String>,)>(id, "update_canister_state_callback", (canister_data_id, CanisterState::Authorizing, )).await.unwrap().0.unwrap();});
    ic_cdk::spawn(async move {ic_cdk::api::call::call::<_, ()>(canister_id, "authorize", (canister_id,)).await.unwrap();});
    set_canister_controllers(canister_id, caller).await.unwrap();

    // mark as done
    ic_cdk::spawn(async move {ic_cdk::api::call::call::<_, (Result<(), String>,)>(id, "update_canister_state_callback", (canister_data_id, CanisterState::Ready,)).await.unwrap().0.unwrap();});
    Ok(canister_id)
}

#[update]
#[candid_method(update)]
async fn create_track(track_name: String) -> Result<(), String> {
    // authorize
    let caller = ic_cdk::caller();
    authorize(&caller).await?;

    // create track 
    add_track(track_name, caller).unwrap();

    Ok(())
}

#[update]
#[candid_method(update)]
async fn remove_track(track_name: String) -> Result<(), String> {
    // authorize
    let caller = ic_cdk::caller();
    authorize(&caller).await?;

    STATE.with(|s| {
        let mut state = s.borrow_mut();

        // check if the track exists 
        let track_id_opt = state.indexes.track.get(&track_name);
        if track_id_opt.is_none() {
            return Err("Track does not exists".to_owned()); 
        }

        // remove related upgrades
        let track_id = track_id_opt.unwrap().to_owned();
        let upgrade_ids_opt = state.relations.track_id_to_upgrade_id.forward.get(&track_id);
        if upgrade_ids_opt.is_some() {
            let upgrade_ids = upgrade_ids_opt.unwrap().to_owned();
            upgrade_ids.iter().for_each(|(upgrade_id, _)| {
                let upgrade = state.upgrades.get(upgrade_id).unwrap().to_owned();
                state.indexes.version.remove(&(track_name.to_owned(),upgrade.version));

                if upgrade.upgrade_from.is_some() {
                    let upgrade_from =  upgrade.upgrade_from.unwrap();
                    state.indexes.upgrade_from.remove(&(upgrade_from.track, upgrade_from.version));
                }
    
                state.upgrades.remove(upgrade_id);
                state.relations.track_id_to_upgrade_id.remove(track_id, upgrade_id.to_owned());
            });
        }
        
        // remove track
        state.tracks.remove(&track_id);
        state.indexes.track.remove(&track_name);
        
        Ok(())
    })
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
fn update_canister_id_callback(canister_data_id: u64, canister_id: Principal) -> Result<(), String> {
    if ic_cdk::caller() != ic_cdk::id() {
        return Err("Unauthorized".to_owned());
    };
    
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let user_data = state.canister_data.get_mut(&canister_data_id).unwrap();
        user_data.id = Some(canister_id)
    });

    Ok(())
}

#[ic_cdk_macros::update]
fn create_canister_data_callback(caller: Principal, canister_data_id: u64) -> Result<u64, String> {
    if ic_cdk::caller() != ic_cdk::id() {
        return Err("Unauthorized".to_owned());
    };

    STATE.with(|s| {
        let mut state = s.borrow_mut();

        // get or create profile
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

        // let canister_data_id = uuid(&caller.to_text());

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
fn get_next_upgrades(version: String, track: String) -> Vec<UpgradeWithTrack> {
    STATE.with(|s| {
        let state = s.borrow();
        state.upgrades.iter()
        .filter(|&(_, u)| {
            if u.upgrade_from.is_none() {
                return false;
            } else {
                let upgrade_from = u.upgrade_from.as_ref().unwrap();
                return upgrade_from.version == version && upgrade_from.track == track;
            }
        })
        .map(|(id, u)|{
            let (track_id, _) = state.relations.track_id_to_upgrade_id.backward.get(id).unwrap().first_key_value().unwrap();
            let track = state.tracks.get(track_id).unwrap();
            UpgradeWithTrack{
                version: u.version.to_owned(),
                upgrade_from: u.upgrade_from.to_owned(),
                timestamp: u.timestamp,
                assets: u.assets.to_owned(),
                track: track.name.to_owned(),
                description: u.description.to_owned()
            }
        }).collect::<Vec<_>>()
    })
}


#[query]
#[candid_method(query)]
fn get_upgrades() -> Vec<UpgradeWithTrack> {
    STATE.with(|s| {
        let state = s.borrow();
        state.upgrades.iter().map(|(id, u)| {
					let (track_id,_) = state.relations.track_id_to_upgrade_id.backward.get(id).unwrap().first_key_value().unwrap();
					let track: &Track  = state.tracks.get(track_id).unwrap();
					UpgradeWithTrack {
						version: u.version.to_owned(),
						upgrade_from: u.upgrade_from.to_owned(),
						timestamp: u.timestamp,
						assets: u.assets.to_owned(),
						track: track.name.to_owned(),
                        description: u.description.to_owned()
					}
				}).collect::<Vec<_>>()
    })
}

#[query]
#[candid_method(query)]
fn get_upgrade(version: String, track: String) -> Option<UpgradeWithTrack> {
	STATE.with(|s| {
		let state = s.borrow();

        // get upgrade id 
        let upgrade_id_opt = state.indexes.version.get(&(track, version));
        if upgrade_id_opt.is_none() {
            return None;
        }

		// get upgrades 
        let upgrade_id = upgrade_id_opt.unwrap();
		let upgrade = state.upgrades.get(upgrade_id).unwrap();
        let (track_id, _) = state.relations.track_id_to_upgrade_id.backward.get(upgrade_id).unwrap().first_key_value().unwrap();
        let track = state.tracks.get(track_id).unwrap();

        Some(UpgradeWithTrack{
            version: upgrade.version.to_owned(),
            upgrade_from: upgrade.upgrade_from.to_owned(),
            timestamp: upgrade.timestamp,
            assets: upgrade.assets.to_owned(),
            track: track.name.to_owned(),
            description: upgrade.description.to_owned()
        })
	})
}


#[update]
#[candid_method(update)]
async fn create_upgrade(version: String, upgrade_from_opt: Option<UpgradeFrom>, assets: Vec<String>, track: String, description: String ) -> Result<(), String> {
    // authorize
    let caller = ic_cdk::caller();
    authorize(&caller).await?;

    // check if version exists
    let index_version = STATE.with(|s| s.borrow().indexes.version.to_owned());

    if index_version.contains_key(&(track.to_owned(), version.to_owned())) {
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
        upgrade_from: upgrade_from_opt.to_owned(),
        timestamp: ic_cdk::api::time(),
        assets: assets.clone(),
        description: description.to_owned()
    };
    let upgrade_id = uuid(&caller.to_text());
    STATE.with(|s| {
        let mut state = s.borrow_mut();
        state.upgrades.insert(upgrade_id, upgrade);
        state.indexes.version.insert((track.to_owned(), version), upgrade_id);

        if upgrade_from_opt.is_some() {
            let upgrade_from = upgrade_from_opt.unwrap();
            state.indexes.upgrade_from.insert((upgrade_from.track, upgrade_from.version), upgrade_id);
        }
        
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
        let upgrade_id_opt = state.indexes.version.get(&(track.to_owned(), version.to_owned())).cloned();
        if upgrade_id_opt == None {
            return Err("Version does not exist".to_owned()); 
        }

        let upgrade_id= upgrade_id_opt.unwrap();
        let upgrade = state.upgrades.get(&upgrade_id).cloned().unwrap();

        state.indexes.version.remove(&(track.to_owned(), upgrade.version));
        if upgrade.upgrade_from.is_some() {
            let upgrade_from = upgrade.upgrade_from.unwrap();
            state.indexes.upgrade_from.remove(&(upgrade_from.track, upgrade_from.version));
        }

        state.upgrades.remove(&upgrade_id);
        let track_id = state.indexes.track.get(&track).unwrap().to_owned();
        state.relations.track_id_to_upgrade_id.remove(track_id, upgrade_id);

        Ok(())
    })
}


#[query]
#[candid_method(query)]
fn handle_interface(interface_version: String, function_name: String, payload: Vec<u8>) -> Result<Vec<u8>, String> {
    if interface_version == "v1".to_owned() {
        if function_name == "get_next_upgrades".to_owned() {
            let (version, track) = candid::Decode!(&payload, (String, String)).unwrap();
            let res = get_next_upgrades(version, track);
            Ok(candid::Encode!(&res).unwrap())
        } else if function_name == "get_upgrade"{
            let (version, track) = candid::Decode!(&payload, (String, String)).unwrap();
            let res = get_upgrade(version, track);
            Ok(candid::Encode!(&res).unwrap())
        }else {
            Err("Invalid function name".to_owned())
        }
    } else {
        Err("Invalid version".to_owned())
    }
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
    
    use candid::utils::{service_compatible, CandidSource};
    use std::path::PathBuf;
    use ic_cdk::export::candid::export_service;
    
    
    export_service!();
    let new_interface = __export_service();

    let old_interface = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("parent.did");
    service_compatible(CandidSource::Text(&new_interface), CandidSource::File(old_interface.as_path())).unwrap();
}



fn get_latest_version() -> UpgradeWithTrack {
    STATE.with(|s| {
        let state = s.borrow();
        let default_track_id = state.indexes.track.get(&DEFAULT_TRACK.to_owned()).unwrap();
        let upgrades_ids = state.relations.track_id_to_upgrade_id.forward.get(default_track_id);
        let mut upgrades = upgrades_ids.unwrap().iter().map(|(upgrade_id, _)| {
            let upgrade = state.upgrades.get(upgrade_id).unwrap();
            UpgradeWithTrack {
                version: upgrade.version.to_owned(),
                upgrade_from: upgrade.upgrade_from.to_owned(),
                timestamp: upgrade.timestamp,
                assets: upgrade.assets.to_owned(),
                track: DEFAULT_TRACK.to_owned(),
                description: upgrade.description.to_owned()
            }
        }).collect::<Vec<_>>();
        upgrades.sort_by(|a, b| b.version.cmp(&a.version));
        upgrades.first().unwrap().to_owned()
    })

}

async fn authorize(caller: &Principal) -> Result<(), String> {
    let canister_id = ic_cdk::id();
  
    let args = CanisterIdRecord { canister_id };
  
    let (canister_status,) = ic_cdk::call::<_, (CanisterStatusResponse,)>(
        Principal::management_canister(),
        "canister_status",
        (args,),)
        .await
        .map_err(|(code, msg)| format!("Canister status {}: {}", code as u8, msg))
        .unwrap();
    
    let caller_is_controller = canister_status.settings.controllers.iter().any(|c| c == caller);

    if caller_is_controller {
        Ok(())
    } else {
        Err("Caller is not a controller".to_owned())
    }
}

fn add_track(name: String, caller: Principal) -> Result<(), String> {
    STATE.with(|s| {
        let mut state = s.borrow_mut();

        // check if the track exists 
        if state.indexes.track.contains_key(&name) {
            return Err("Track already exists".to_owned()); 
        }

        // add track
        let track_id = uuid(&caller.to_string());
        let track =  Track { name:  name.to_owned()};
        state.tracks.insert(track_id, track);
        state.indexes.track.insert(name, track_id);
        
        Ok(())
    })
}