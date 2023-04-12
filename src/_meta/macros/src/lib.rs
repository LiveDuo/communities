
use candid::{Principal};
use proc_macro::{TokenStream, TokenTree};
use std::path::{PathBuf};
use quote::quote;

// https://github.com/Michael-F-Bryan/include_dir/blob/master/macros/src/lib.rs
// https://doc.rust-lang.org/reference/procedural-macros.html

static MAINNET_CANISTERS: &[(&str, [u8; 10])] = &[
    ("ledger", [0, 0, 0, 0, 0, 0, 0, 2, 1, 1]),
    ("cmc", [0, 0, 0, 0, 0, 0, 0, 4, 1, 1])
];

#[proc_macro]
pub fn get_canister(input: TokenStream) -> TokenStream {

    let tokens = input.into_iter().collect::<Vec<_>>();
    let lit = match tokens.as_slice() { [TokenTree::Literal(lit)] => lit.to_string(), _ => panic!(), };
    let canister_name = &lit[1..lit.len() - 1];

    let env_opt = option_env!("RUST_MODE");

    if env_opt == Some("production") {
        let canister_mainnet_opt = MAINNET_CANISTERS.iter().find(|(k, _)| k == &canister_name);
        if let Some((_, canister_mainnet)) = canister_mainnet_opt {
            let canister_slice = canister_mainnet.to_owned();
            return (quote!(Some(Principal::from_slice(&[ #(#canister_slice), * ])))).into();
        } else {
            return (quote!(None)).into();
        }
    } else {
        let path = PathBuf::from("./.dfx/local/canister_ids.json");
        if path.exists() {
            let content = std::fs::read_to_string(path).unwrap();
            let canisters_data: serde_json::Value = serde_json::from_str(&content).unwrap();

            let canister_opt = canisters_data.get(canister_name);
            if canister_opt == None { return (quote!(None)).into(); }
            let canister_text= canister_opt.unwrap().get("local").unwrap().as_str().unwrap();

            let canister = Principal::from_text(canister_text).unwrap();
            let canister_slice = canister.as_slice();
            return (quote!(Some(Principal::from_slice(&[ #(#canister_slice), * ])))).into();
        } else {
            return (quote!(None)).into();
        }
    }
}
