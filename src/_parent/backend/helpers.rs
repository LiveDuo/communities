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
async fn principal_account_id(principal: Principal) -> (Principal, Principal, String) {
    let canister_id = ic_cdk::api::id();
    let account = AccountIdentifier::new(&canister_id, &principal_to_subaccount(&principal));
    return (principal, canister_id, account.to_string());
}

// dfx ledger transfer --ledger-canister-id rrkah-fqaaa-aaaaa-aaaaq-cai --amount 1 --memo 1347768404 b82e34dc2414c91ac7b4db4ea07f936c2e35a1793f3da9c752fb9f9b3ee4629a
