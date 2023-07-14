use ic_cdk::api::management_canister::main::*;
use candid::{Principal, Encode};

use include_macros::get_canister;

use crate::state::*;
use crate::utils::*;

use sha2::{Digest, Sha256};

pub const PAYMENT_AMOUNT: u64 = 100_000_000; // 1 ICP
pub const TRANSFER_FEE: u64 = 10_000;

pub static LEDGER_CANISTER: Option<Principal> = get_canister!("ledger");
// static CMC_CANISTER: Option<Principal> = get_canister!("cmc");

pub async fn install_code(canister_id: Principal, version: &String, caller: &Principal) -> Result<(), String> {
    // get wasm
    let wasm_bytes: Vec<u8> = get_asset(format!("/upgrade/{}/child.wasm", version).to_string());
    if wasm_bytes.is_empty() {
        return Err(format!("WASM not found"));
    }

    // get wasm hash
    let mut hasher = Sha256::new();
    hasher.update(wasm_bytes.clone());
    let wasm_hash = hasher.finalize()[..].to_vec();

    // install canister code
    let install_args = InstallCodeArgument {
        mode: CanisterInstallMode::Install,
        canister_id: canister_id,
        wasm_module: wasm_bytes,
        arg: Encode!(&Some(caller.to_owned()), &Some(wasm_hash)).unwrap(),
    };

    let (result,) = ic_cdk::call::<_, ((),)>(Principal::management_canister(),"install_code",(install_args,),).await.map_err(|(code, msg)| format!("Install code error: {}: {}", code as u8, msg)).unwrap();

    Ok(result)
}

pub async fn create_canister(canister_id: Principal) -> Result<Principal, String> {
    let canister_setting = CanisterSettings {
        controllers: Some(vec![canister_id]),
        compute_allocation: None,
        memory_allocation: None,
        freezing_threshold: None,
    };
    let create_args = CreateCanisterArgument {
        settings: Some(canister_setting),
    };

    let (create_result,) = ic_cdk::api::call::call_with_payment::<_, (CanisterIdRecord,)>(Principal::management_canister(),"create_canister",(create_args,),200_000_000_000,).await.map_err(|(code, msg)| format!("Create canister error: {}: {}", code as u8, msg)).unwrap();
    Ok(create_result.canister_id)
}

pub async fn mint_cycles(caller: Principal, canister_id: Principal) -> Result<(), String> {
    let account = AccountIdentifier::new(&canister_id, &principal_to_subaccount(&caller));

    let account_balance_args = AccountBalanceArgs { account: account };
    let balance_result: Result<(Tokens,), _> = ic_cdk::call(
        LEDGER_CANISTER.unwrap(),
        "account_balance",
        (account_balance_args,),
    )
    .await;

    let tokens: Tokens = match balance_result {
        Ok(x) => x.0,
        Err((code, msg)) => return Err(format!("Account balance error: {}: {}", code as u8, msg)),
    };

    if tokens.e8s < PAYMENT_AMOUNT {
        return Err(format!("Insufficient balance"));
    }

    let default_subaccount = Subaccount([0; 32]);

    let transfer_args = TransferArgs {
        memo: Memo(1347768404),
        amount: Tokens {
            e8s: PAYMENT_AMOUNT,
        },
        fee: Tokens { e8s: TRANSFER_FEE },
        from_subaccount: Some(principal_to_subaccount(&caller)),
        to: AccountIdentifier::new(&canister_id, &default_subaccount),
        created_at_time: None,
    };

    let _transfer_result: (TransferResult,) = ic_cdk::call(LEDGER_CANISTER.unwrap(), "transfer", (transfer_args,)).await.map_err(|(code, msg)| format!("Transfer error: {}: {}", code as u8, msg)).unwrap();

    Ok(())
}

pub async fn set_canister_controllers( child_canister_id: Principal,caller: Principal) -> Result<(), String> {
    let update_settings_args = UpdateSettingsArgument {
        canister_id: child_canister_id,
        settings: CanisterSettings {
            controllers: Some(vec![child_canister_id, caller]),
            compute_allocation: None,
            memory_allocation: None,
            freezing_threshold: None,
        },
    };

    let _result = ic_cdk::call::<_, ((),)>(Principal::management_canister(),"update_settings",(update_settings_args,),).await.map_err(|(code, msg)| format!("Update settings: {}: {}", code as u8, msg)).unwrap();

    Ok(())
}
