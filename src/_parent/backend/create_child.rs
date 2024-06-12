use ic_cdk::api::management_canister::main::*;
use candid::{Principal, Encode};

use include_macros::get_canister;
use ic_certified_assets::types::{StoreArg, BatchOperation};
use serde_bytes::ByteBuf;

use crate::state::*;
use crate::assets::*;

pub const TOPUP_CYCLES: u64 = 200_000_000_000; // 200b cycles

pub const TRANSFER_FEE: u64 = 10_000;
pub const MINT_MEMO: u64 = 1347768404;
pub const MAX_MESSAGE_SIZE: u32 = 2097152 - 20000;// 2mb max message size - 20kb padding

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
    if tokens.e8s == 0 {
        return Err("Insufficient balance".to_owned());
    }
    let transfer_args = TransferArgs {
        memo: Memo(MINT_MEMO),
        amount: Tokens { e8s: tokens.e8s - TRANSFER_FEE, },
        fee: Tokens { e8s: TRANSFER_FEE },
        from_subaccount: Some(principal_to_subaccount(&caller)),
        to: AccountIdentifier::new(&CMC_CANISTER.unwrap(), &principal_to_subaccount(&canister_id)),
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
        return  Err(format!("Error from {:?}", e));
    }

    // notify top_up
    let block_index = transfer_res.unwrap();
    let (notify_res,) = ic_cdk::call::<_, (Result<u128, NotifyError>,)>(
        CMC_CANISTER.unwrap(),
        "notify_top_up",
        (NotifyTopupArgs { block_index, canister_id, },)
    ).await
    .map_err(|(code, msg)|
        format!("Notify top-up error: {}: {}", code as u8, msg)
    ).unwrap();

    if let Err(e) = notify_res {
        return  Err(format!("Error from {:?}", e));
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
        reserved_cycles_limit: None
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

// create_child
pub async fn store_assets(canister_id: Principal, assets: &Vec<String>, version: &String, track: &String) -> Result<(), String> {
    // get batches
    let mut batches: Vec<(u32, Vec<BatchOperation>)> = vec![(0, vec![])];
    for asset in assets {
        // skip unnecessary files
        if asset == &format!("/upgrades/{track}/{version}/child.wasm") {
            continue;
        }
  
        // get asset content
        let asset_bytes: Vec<u8> = get_asset(asset.to_owned());
        let content;
        if asset == &format!("/upgrades/{track}/{version}/static/js/bundle.js") {
            let bundle_str = String::from_utf8(asset_bytes).expect("Invalid JS bundle");
            let bundle_with_env =
                bundle_str.replace("REACT_APP_CHILD_CANISTER_ID", &canister_id.to_string());
            content = bundle_with_env.as_bytes().to_vec();
        } else {
            content = asset_bytes;
        }
  
        // upload asset
        let key = asset.replace(&format!("/upgrades/{track}/{version}"), "");

        let store_args = StoreArg {
            key: key.to_owned(),
            content_type: get_content_type(&key),
            content_encoding: "identity".to_owned(),
            content: ByteBuf::from(content.to_owned()),
            sha256: None
        };
        // add items to batches
        let mut is_stored_already = false;
        for (batch_size, batch) in batches.iter_mut() {
            if *batch_size + content.len() as u32 <= MAX_MESSAGE_SIZE  {
                *batch_size+= content.len() as u32;
                batch.push(BatchOperation::StoreAsset(store_args.to_owned()));
                is_stored_already = true;
                break;
            }
        }
        if !is_stored_already  {
            batches.push((content.len() as u32, vec![BatchOperation::StoreAsset(store_args.to_owned())]));
        }
    }

    // upload assets
    for (_, batch_operations)  in batches {
        ic_cdk::call::<_, ()>(
            canister_id, 
            "execute_batch",
            (batch_operations,))
            .await
            .map_err(|(_, msg)| format!("commit batch: {}", msg))
            .unwrap();
    }
  
    Ok(())
}

pub async fn set_canister_controllers( canister_id: Principal,caller: Principal) -> Result<(), String> {

    let canister_settings = CanisterSettings {
        controllers: Some(vec![canister_id, caller]),
        compute_allocation: None,
        memory_allocation: None,
        freezing_threshold: None,
        reserved_cycles_limit: None
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
