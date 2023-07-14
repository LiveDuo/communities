use candid::{Nat, Principal};
use ic_cdk::api::management_canister::main::{CanisterIdRecord, CanisterStatusResponse};
use ic_certified_assets::types::{GetArg, GetChunkArg};
use num_traits::cast::ToPrimitive;
use crate::state::StoreAssetArgs;
use std::collections::hash_map;
use std::hash::Hash;
use std::hash::Hasher;

pub fn get_asset(key: String) -> Vec<u8> {
    // get asset length
    let arg = GetArg {
        key: key.to_owned(),
        accept_encodings: vec!["identity".to_string()],
    };
    let encoded_asset = ic_certified_assets::get(arg);
    let total_length = encoded_asset.total_length.0.to_usize().unwrap();

    // concat asset chunks
    let mut index = 0;
    let mut content = vec![];
    while content.len() < total_length {
        let arg = GetChunkArg {
            index: Nat::from(index),
            key: key.to_owned(),
            content_encoding: "identity".to_string(),
            sha256: None,
        };
        let chunk_response = ic_certified_assets::get_chunk(arg);
        let chunk_data = chunk_response.content.as_ref().to_vec();
        content.extend(chunk_data.to_owned());
        index += 1;
    }
    return content;
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

pub async fn store_assets(canister_id: Principal, assets: &Vec<String>, version: &String) -> Result<(), String> {
  for asset in assets {
      // skip unnecessary files
      if asset == &format!("/upgrade/{}/child.wasm", version) {
          continue;
      }

      // get asset content
      let asset_bytes: Vec<u8> = get_asset(asset.to_owned());
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

pub fn uuid(seed: &str) -> u64 {
  let timestamp: u64 = ic_cdk::api::time() * 1000 * 1000;
  let str = format!("{}-{}", seed, timestamp);
  let mut s = hash_map::DefaultHasher::new();
  str.hash(&mut s);
  s.finish()
}


pub async fn authorize(caller: &Principal) -> Result<(), String> {
  let canister_id = ic_cdk::id();

  let args = CanisterIdRecord { canister_id };

  let (canister_status,) = ic_cdk::call::<_, (CanisterStatusResponse,)>(Principal::management_canister(),"canister_status",(args,),)
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