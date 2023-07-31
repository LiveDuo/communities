use candid::{CandidType, Deserialize, Principal};
use sha2::{Sha256, Digest};
use crate::utils::{get_asset, get_content_type};
use crate::state::STATE;
use ic_cdk::api::management_canister::main::*;
use serde_bytes::ByteBuf;
use ic_cdk::api::call::CallResult;
use ic_certified_assets::rc_bytes::RcBytes;
use ic_certified_assets::types::{StoreArg, DeleteAssetArguments};


#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq)]
pub struct Upgrade { 
    pub version: String,
    pub upgrade_from: Option<Vec<u8>>,
    pub timestamp: u64,
    pub wasm_hash: Vec<u8>,
    pub assets: Vec<String>
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct UpgradeWithTrack {
    pub version: String,
    pub upgrade_from: Option<Vec<u8>>,
    pub timestamp: u64,
    pub wasm_hash: Vec<u8>,
    pub assets: Vec<String>,
    pub track: String
}

pub fn update_wasm_hash() { 
  let wasm_bytes = get_asset("/temp/child.wasm".to_owned());
  let mut hasher = Sha256::new();
  hasher.update(wasm_bytes.clone());
  let wasm_hash = hasher.finalize()[..].to_vec();
  STATE.with(|s| s.borrow_mut().wasm_hash = Some(wasm_hash));
}


pub async fn upgrade_canister_cb(wasm: Vec<u8>) {
  ic_cdk::println!("Child: Self upgrading...");

  // upgrade code
  let id = ic_cdk::id();
  let install_args = InstallCodeArgument { mode: CanisterInstallMode::Upgrade, canister_id: id, wasm_module: wasm, arg: vec![], };
  let result: CallResult<()> = ic_cdk::api::call::call(Principal::management_canister(), "install_code", (install_args,),).await;
  result.unwrap();
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

Ok(())
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