use candid::{Nat, Principal};
use ic_certified_assets::types::{GetArg, GetChunkArg};
use num_traits::ToPrimitive;
use std::collections::hash_map;
use std::hash::{Hash, Hasher};
use std::ops::Div;

use crate::state::{STATE, Role};

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


pub fn uuid(seed: &str) -> u64 {
  let timestamp: u64 = ic_cdk::api::time() * 1000 * 1000;
  let str = format!("{}-{}", seed, timestamp);
  let mut s = hash_map::DefaultHasher::new();
  str.hash(&mut s);
  s.finish()
}


pub fn get_content_type(name: &str) -> String {
	if name.ends_with(".html") { return "text/html".to_string() }
	else if name.ends_with(".js") { return "text/javascript".to_string() }
	else if name.ends_with(".css") { return "text/css".to_string() } 
	else if name.ends_with(".txt") { return "text/plain".to_string() }
	else if name.ends_with(".md") { return "text/markdown".to_string() }
	else { return "application/octet-stream".to_string() }
}


pub fn format_number(num: u64) -> String {
    let convert_num = num as f64;
    let si = vec![(1.0, ""), (1_000.0, "K"), (1_000_000.0, "M"),(1_000_000_000.0, "B"), (1_000_000_000_000.0,"T")];
    let mut index = si.len() -1;
    while convert_num <= si[index].0 {
        index-=1;
    }
    let num1 = convert_num.div(si[index].0);
    let digits = if num1 > 0.0 {3 - (num1.log10() as usize + 1)} else {3};
    format!("{:.*}{}", digits, num1, si[index].1)
}

pub fn get_caller_roles(caller: &Principal) -> Vec<Role> {
    STATE.with(|s| {
        let state = s.borrow();
        let profile_id_opt = state.indexes.active_principal.get(caller);

        if profile_id_opt.is_none() {
            return vec![];
        }

        state
            .relations
            .profile_id_to_role_id
            .forward
            .get(profile_id_opt.unwrap())
            .unwrap()
            .iter()
            .map(|(role_id, _)| 	state.roles.get(role_id).unwrap().to_owned())
            .collect::<Vec<_>>()
    })
}