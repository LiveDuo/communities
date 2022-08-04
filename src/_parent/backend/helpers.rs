use ic_ledger_types::{AccountIdentifier, Subaccount};

use ic_cdk::export::candid::{candid_method};
use candid::{Principal};
use std::convert::TryInto;

pub fn principal_to_subaccount(principal_id: &Principal) -> Subaccount {
    let mut subaccount = [0; std::mem::size_of::<Subaccount>()];
    let principal_id = principal_id.as_slice();
    subaccount[0] = principal_id.len().try_into().unwrap();
    subaccount[1..1 + principal_id.len()].copy_from_slice(principal_id);

    Subaccount(subaccount)
}

#[ic_cdk_macros::query]
#[candid_method(query)]
async fn principal_account_id(principal: Principal) -> String {
    let canister_id = ic_cdk::api::id();
    let account = AccountIdentifier::new(&canister_id, &principal_to_subaccount(&principal));
    return account.to_string();
}

#[ic_cdk_macros::query]
#[candid_method(query)]
async fn caller_account_id() -> String {
    let canister_id = ic_cdk::api::id();
    let caller = ic_cdk::caller();
    let account = AccountIdentifier::new(&canister_id, &principal_to_subaccount(&caller));
    return account.to_string();
}

// CANISTER_USER_ACCOUNT = dfx canister call parent caller_account_id
// dfx ledger transfer --ledger-canister-id $(dfx canister id ledger) --amount 1 --memo 1347768404 CANISTER_USER_ACCOUNT
// fx ledger balance --ledger-canister-id $(dfx canister id ledger) CANISTER_USER_ACCOUNT
