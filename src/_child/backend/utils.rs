use candid::{Nat, Principal};
use ic_certified_assets::types::{GetArg, GetChunkArg};
use icrc_ledger_types::icrc1::account::{Account, Subaccount, DEFAULT_SUBACCOUNT};
use num_traits::ToPrimitive;
use std::cell::RefMut;
use std::collections::hash_map;
use std::hash::{Hash, Hasher};
use std::ops::Div;

use crate::state::{STATE, UserRole, State};

pub fn get_asset(key: String) -> Vec<u8> {
    // get asset length
    let arg = GetArg {
        key: key.to_owned(),
        accept_encodings: vec!["identity".to_string()],
    };
    let encoded_asset = ic_certified_assets::get(arg);
    let total_length = encoded_asset.total_length.0.to_usize().unwrap();

    // concat asset chunks
    let mut index = 0 as u64;
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


pub fn uuid(state: &mut RefMut<'_, State>) -> u64 {
    state.tx_count += 1;
    let mut s = hash_map::DefaultHasher::new();
    state.tx_count.hash(&mut s);
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

pub fn get_user_roles(caller: &Principal) -> Option<Vec<UserRole>> {
    STATE.with(|s| {
        let state = s.borrow();
        let profile_id_opt = state.indexes.active_principal.get(caller);

        if profile_id_opt.is_none() {
            return None;
        }
        let role_ids =  state.relations.profile_id_to_role_id.forward.get(profile_id_opt.unwrap());

        if role_ids.is_none() {
            return Some(vec![]);
        }
        let user_roles = role_ids
            .unwrap()
            .iter()
            .map(|(role_id, _)| state.roles.get(role_id).unwrap().role.to_owned())
            .collect::<Vec<_>>();
        Some(user_roles)
    })
}


pub fn default_account(owner: &Principal) -> Account {
    Account {
        owner: owner.clone(),
        subaccount: Some(DEFAULT_SUBACCOUNT.clone()),
    }
}

pub fn burn_subaccount() -> Subaccount {
    let mut bytes = [0; 32];
    let slice = b"BURN SUBACCOUNT";
    bytes[0..15].copy_from_slice(slice);
    bytes
}

pub fn burn_account() -> Account {
    Account {
        owner: ic_cdk::api::id(),
        subaccount: Some(burn_subaccount()),
    }
}

pub fn account_transformer(account: Account) -> Account {
    if let Some(_) = account.subaccount {
        account
    } else {
        Account {
            owner: account.owner,
            subaccount: Some(DEFAULT_SUBACCOUNT.clone()),
        }
    }
}