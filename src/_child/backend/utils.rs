use candid::{Nat};
use ic_certified_assets::types::{GetArg, GetChunkArg};
use num_traits::ToPrimitive;
use std::collections::hash_map;
use std::hash::{Hash, Hasher};

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
