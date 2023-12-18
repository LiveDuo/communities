use std::ops::Sub;
use candid::{CandidType, Deserialize, Principal};
use crate::utils::{get_asset, get_content_type, format_number};
use crate::state::STATE;
use ic_cdk::api::management_canister::main::*;
use ic_cdk::api::canister_balance;
use serde_bytes::ByteBuf;
use ic_certified_assets::rc_bytes::RcBytes;
use ic_certified_assets::types::{StoreArg, DeleteAssetArguments};

const UPGRADE_THRESHOLD_CYCLES: u64 = 100_000_000_000; // 100b cycles

#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct UpgradeFrom {
    pub track: String,
    pub version: String
}
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct UpgradeWithTrack {
    pub version: String,
    pub upgrade_from: Option<UpgradeFrom>,
    pub timestamp: u64,
    pub assets: Vec<String>,
    pub description: String,
    pub track: String
}

pub async fn authorize(caller: &Principal) -> Result<(), String> {
	let canister_id = ic_cdk::id();
	let args = CanisterIdRecord { canister_id };
	let (canister_status, ) = ic_cdk::api::call::call::<_, (CanisterStatusResponse, )>(Principal::management_canister(), "canister_status", (args,)).await.map_err(|(code, err)| format!("{:?} - {}",code, err)).unwrap();

	if canister_status.settings.controllers.iter().any(|c| c ==  caller) {
		Ok(())
	} else {
		Err(format!("Caller is not a controller"))
	}
}

pub async fn check_canister_cycles_balance() -> Result<(), String> {

  let canister_balance = canister_balance();

  if canister_balance.ge(&UPGRADE_THRESHOLD_CYCLES) {
    Ok(())
  } else  {
    Err(format!("Not enough cycles to upgrade. Top up the canister with {} additional cycles.", format_number(UPGRADE_THRESHOLD_CYCLES.sub(canister_balance))))
  }
}


pub async fn store_assets_to_temp(parent_canister: Principal, assets: &Vec<String>, version: &str, track: &String) -> Result<(), String> {
  let canister_id = ic_cdk::id();

  for asset in assets {
  
      // get asset content
      let (asset_bytes, ): (RcBytes, ) = ic_cdk::call(parent_canister, "retrieve", (asset.to_owned(),),).await.unwrap();

      // replace env car
  let content;
  if asset == &format!("/upgrades/{track}/{version}/static/js/bundle.js") {
    let bundle_str = String::from_utf8(asset_bytes.to_vec()).expect("Invalid JS bundle");
    let bundle_with_env = bundle_str.replace("REACT_APP_CHILD_CANISTER_ID", &canister_id.to_string());
    content = ByteBuf::from(bundle_with_env.as_bytes().to_vec());
  } else {
    content = ByteBuf::from(asset_bytes.to_vec());
  }

  // upload asset
  let key = asset.replace(&format!("/upgrades/{track}/{version}"), "/temp");
  let store_args = StoreArg {
          key: key.to_owned(),
          content_type: get_content_type(&key),
          content_encoding: "identity".to_owned(),
          content,
          sha256: None
      };
      ic_certified_assets::store(store_args);
  }

  // store metadata
  let metadata = format!("{}-{}", track, version);
  let content = ByteBuf::from(metadata.as_bytes().to_vec());
  let key = format!("/temp/metadata.txt");
  let store_args = StoreArg {
      key: key.to_owned(),
      content_type: get_content_type(&key),
      content_encoding: "identity".to_owned(),
      content,
      sha256: None
  };
  ic_certified_assets::store(store_args);

Ok(())
}

pub fn upgrade_canister_cb(wasm: Vec<u8>) {
  ic_cdk::println!("Child: Self upgrading...");

  // upgrade code
  let canister_id = ic_cdk::id();
  let install_args = InstallCodeArgument {
    mode: CanisterInstallMode::Upgrade, 
    canister_id,
    wasm_module: wasm, 
    arg: canister_id.as_slice().to_vec(), 
  };

  ic_cdk::spawn(async move{
    ic_cdk::notify::<_>(candid::Principal::management_canister(), "install_code", (install_args,)).unwrap()
  });
}


pub fn update_metadata() { 
  let metadata_vec = get_asset("/temp/metadata.txt".to_owned());
  let metadata_content =  String::from_utf8(metadata_vec).unwrap();
  let metadata_content_splitted =  metadata_content.split('-').collect::<Vec<_>>();
  STATE.with(|s| {
    let mut state =  s.borrow_mut();
    state.version = Some(metadata_content_splitted[1].to_owned());
    state.track = Some(metadata_content_splitted[0].to_owned());
  });
}

pub fn replace_assets_from_temp() {
  let assets = ic_certified_assets::list();

  // cleanup previous assets
  let prev_assets = &assets.iter().filter(|k| !k.key.starts_with("/temp")).collect::<Vec<_>>();
  for asset  in prev_assets {
      ic_certified_assets::delete_asset(DeleteAssetArguments { key: asset.key.to_owned() });
  }

  // store new assets
  let temp_assets = &assets.iter().filter(|k| k.key.starts_with("/temp")).collect::<Vec<_>>();
  for asset in  temp_assets {
      let asset_content: Vec<u8> = get_asset(asset.key.to_owned());
      let args_store = StoreArg {
          key: asset.key.replace("/temp", ""),
          content_type: asset.content_type.to_owned(),
          content_encoding: "identity".to_owned(),
          content: ByteBuf::from(asset_content),
          sha256: None
      };
      ic_certified_assets::store(args_store);
      ic_certified_assets::delete_asset(DeleteAssetArguments { key: asset.key.to_owned() });
  }
}






