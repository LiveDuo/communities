use ic_cdk::api::management_canister::main::*;
use candid::{Principal, Encode};

use include_macros::get_canister;

use crate::state::*;
use crate::utils::*;

pub const TOPUP_CYCLES: u64 = 200_000_000_000; // 200b cycles

pub const TRANSFER_FEE: u64 = 10_000;
pub const MINT_MEMO: u64 = 1347768404;
pub const DEFAULT_SUBACCOUNT: Subaccount = Subaccount([0; 32]);

pub static LEDGER_CANISTER: Option<Principal> = get_canister!("ledger");
pub static CMC_CANISTER: Option<Principal> = get_canister!("cmc");

pub async fn mint_cycles(caller: Principal, canister_id: Principal) -> Result<(), String> {

    // get icp balance
    let account = AccountIdentifier::new(&canister_id, &principal_to_subaccount(&caller));
    let balance_result = ic_cdk::call::<_, (Tokens, )>(
        LEDGER_CANISTER.unwrap(),
        "account_balance",
        (AccountBalanceArgs { account },),
    )
    .await
    .map_err(|(code, msg)|
        format!("Account balance error: {}: {}", code as u8, msg)
    ).unwrap();

    // mint cycles
    let (tokens, ) = balance_result;
    let transfer_args = TransferArgs {
        memo: Memo(MINT_MEMO),
        amount: Tokens { e8s: tokens.e8s - TRANSFER_FEE, },
        fee: Tokens { e8s: TRANSFER_FEE },
        from_subaccount: Some(principal_to_subaccount(&caller)),
        to: AccountIdentifier::new(&canister_id, &DEFAULT_SUBACCOUNT),
        created_at_time: Some(Timestamp { timestamp_nanos: ic_cdk::api::time() }),
    };
    let (transfer_res, ) = ic_cdk::call::<_, (Result<BlockIndex, TransferError>,)>(
        LEDGER_CANISTER.unwrap(),
        "transfer", (transfer_args,)
    ).await
    .map_err(|(code, msg)|
        format!("Transfer error: {}: {}", code as u8, msg)
    ).unwrap();

    if let Err(e) = transfer_res {
        return  Err(format!("error from{:?}", e));
    }

    // notify top_up
    let notify_args = NotifyTopupArgs {
        block_index: transfer_res.unwrap(),
        canister_id,
    };
    
    let (notify_res,) = ic_cdk::call::<_, (Result<u128, NotifyError>,)>(
        CMC_CANISTER.unwrap(),
        "notify_top_up",
        (notify_args,)
    ).await
    .map_err(|(code, msg)| format!("Notify topup  error: {}: {}", code as u8, msg)).unwrap();

    if let Err(e) = notify_res {
        return  Err(format!("error from{:?}", e));
    }

    Ok(())
}

// NOTE: we may want to use CMC to transfer any ICP sent to the user subaccount by mistake too
pub async fn create_canister(canister_id: Principal) -> Result<Principal, String> {
    let canister_setting = CanisterSettings {
        controllers: Some(vec![canister_id]),
        compute_allocation: None,
        memory_allocation: None,
        freezing_threshold: None,
    };
    let (create_result,) = ic_cdk::api::call::call_with_payment::<_, (CanisterIdRecord,)>(
        Principal::management_canister(),
        "create_canister",
        (CreateCanisterArgument { settings: Some(canister_setting), },),
        TOPUP_CYCLES,
    ).await
    .map_err(|(code, msg)|
        format!("Create canister error: {}: {}", code as u8, msg)
    ).unwrap();
    Ok(create_result.canister_id)
}

pub async fn install_code(canister_id: Principal, track: &String, version: &String, caller: &Principal) -> Result<(), String> {
    // get wasm
    let wasm_bytes: Vec<u8> = get_asset(format!("/upgrades/{track}/{version}/child.wasm").to_string());
    if wasm_bytes.is_empty() {
        return Err(format!("WASM not found"));
    }

    // install canister code
    let install_args = Encode!(&Some(caller.to_owned()), &Some(version), &Some(track)).unwrap();
    let install_code_args = InstallCodeArgument {
        mode: CanisterInstallMode::Install,
        canister_id: canister_id,
        wasm_module: wasm_bytes,
        arg: install_args,
    };
    let (result,) = ic_cdk::call::<_, ((),)>(
        Principal::management_canister(),
        "install_code",
        (install_code_args,),)
        .await
        .map_err(|(code, msg)| 
            format!("Install code error: {}: {}", code as u8, msg)
        ).unwrap();

    Ok(result)
}

pub async fn set_canister_controllers( canister_id: Principal,caller: Principal) -> Result<(), String> {

    let canister_settings = CanisterSettings {
        controllers: Some(vec![canister_id, caller]),
        compute_allocation: None,
        memory_allocation: None,
        freezing_threshold: None,
    };
    ic_cdk::call::<_, ((),)>(
        Principal::management_canister(),
        "update_settings",
        (UpdateSettingsArgument { canister_id, settings: canister_settings, },),
    ).await
    .map_err(|(code, msg)|
        format!("Update settings: {}: {}", code as u8, msg)
    ).unwrap();

    Ok(())
}
