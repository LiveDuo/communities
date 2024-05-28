use candid::{CandidType, Principal};
use ic_cdk::api::call;
use serde::{Deserialize, Serialize};
use ic_cdk::{query, update};

use icrc_ledger_types::icrc1::account::{Subaccount, Account};
use icrc_ledger_types::icrc::generic_metadata_value::MetadataValue;
use ic_cdk::api::management_canister::main::{canister_status, update_settings, CanisterIdRecord, UpdateSettingsArgument, CanisterSettings};

use std::collections::HashMap;
use std::cell::RefMut;
use crate::utils::{account_transformer, uuid, burn_account, default_account};
use crate::state::{STATE, State, Role, UserRole, Profile, Authentication, IcParams, AuthenticationWithAddress};
use crate::icrc3::*;

pub const DEFAULT_MAX_QUERY_BATCH_SIZE: u128 = 32;
pub const DEFAULT_MAX_UPDATE_BATCH_SIZE: u128 = 32;
pub const DEFAULT_TAKE_VALUE: u128 = 32;
pub const DEFAULT_MAX_TAKE_VALUE: u128 = 32;
pub const DEFAULT_MAX_MEMO_SIZE: u128 = 32;

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TransferArg {
    pub from_subaccount: Option<Subaccount>,
    pub to: Account,
    pub token_id: u128,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum TransferError {
    NonExistingTokenId,
    InvalidRecipient,
    Unauthorized,
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: u128 },
    GenericError { error_code: u128, message: String },
    GenericBatchError { error_code: u128, message: String },
}

pub type TransferResult = Result<u128, TransferError>;

pub type Icrc7TokenMetadata = HashMap<String, MetadataValue>;

#[derive(CandidType, Deserialize, Clone)]
pub struct MintArg {
    pub from_subaccount: Option<Subaccount>,
    pub to: Account,
    pub token_id: u128,
    pub memo: Option<Vec<u8>>,
    pub token_name: Option<String>,
    pub token_description: Option<String>,
    pub token_logo: Option<String>,
}
#[allow(dead_code)]
#[derive(CandidType, Clone)]
pub enum MintError {
    SupplyCapReached,
    Unauthorized,
    TokenIdAlreadyExist,
    GenericError { error_code: u128, message: String },
    GenericBatchError { error_code: u128, message: String },
}

#[derive(CandidType, Deserialize, Clone)]
pub struct BurnArg {
    pub from_subaccount: Option<Subaccount>,
    pub token_id: u128,
    pub memo: Option<Vec<u8>>,
}

#[derive(CandidType, Clone)]
pub enum BurnError {
    Unauthorized,
    NonExistingTokenId,
    GenericError { error_code: u128, message: String },
    GenericBatchError { error_code: u128, message: String },
}

#[derive(CandidType)]
pub struct Standard {
    pub name: String,
    pub url: String,
}

#[query]
pub fn icrc7_symbol() -> String {
   format!("COM-{}", &ic_cdk::id().to_text()[0..5])
}

#[query]
pub fn icrc7_name() -> String {
    format!("Community {}", &ic_cdk::id().to_text()[0..5])
}
#[query]
pub fn icrc7_description() -> Option<String> {
   None
}

#[query]
pub fn icrc7_logo() -> Option<String> {
    None
}

#[query]
pub fn icrc7_total_supply() -> u128 {
    STATE.with(|s| s.borrow().roles.len() as u128)
}

#[query]
pub fn icrc7_supply_cap() -> Option<u128> {
    None
}

#[query]
pub fn icrc7_max_query_batch_size() -> Option<u128> {
    None
}

#[query]
pub fn icrc7_max_update_batch_size() -> Option<u128> {
    None
}

#[query]
pub fn icrc7_default_take_value() -> Option<u128> {
    None
}

#[query]
pub fn icrc7_max_take_value() -> Option<u128> {
    None
}

#[query]
pub fn icrc7_max_memo_size() -> Option<u128> {
    None
}

#[query]
pub fn icrc7_atomic_batch_transfers() -> Option<bool> {
    None
}

#[query]
pub fn icrc7_owner_of(ids: Vec<u128>) -> Vec<Option<Account>> {
    STATE.with(|s| {
        let state = s.borrow();
        ids.iter().map(|id| {
            let profile_id_opt = state.relations.profile_id_to_role_id.backward.get(&(*id as u64));
            if profile_id_opt.is_none() {
                return None; 
            }
            let (profile_id, _) = profile_id_opt.unwrap().first_key_value().unwrap();
            let profile = state.profiles.get(profile_id).unwrap();
            Some(default_account(&profile.active_principal))
        }).collect::<Vec<_>>()
    })
}

#[query]
pub fn icrc7_supported_standards() -> Vec<Standard> {
    vec![Standard {
        name: "ICRC-7".into(),
        url: "https://github.com/dfinity/ICRC/ICRCs/ICRC-7".into(),
    }]
}

#[query]
pub fn icrc7_tokens(prev: Option<u128>, take: Option<u128>) -> Vec<u128> {
    STATE.with(|s| {
        let state = s.borrow();
        let take = take.unwrap_or(DEFAULT_TAKE_VALUE);

        if take > DEFAULT_MAX_TAKE_VALUE {
            ic_cdk::trap("Exceeds Max Take Value")
        }

        match prev {
            Some(prev) => match state.roles.iter().position(|(id, _)| *id == prev as u64) {
                None => vec![],
                Some(index) => state.roles.iter().map(|(id, _)| *id as u128).skip(index).take(take as usize).collect(),
            },
            None => state.roles.iter().map(|(id, _)| *id as u128).take(take as usize).collect::<Vec<_>>(),
        }
    })
}

#[query]
pub fn icrc7_token_metadata(token_ids: Vec<u128>) -> Vec<Option<HashMap<String, MetadataValue>>> {
    STATE.with(|s| {
        let state = s.borrow();
        if token_ids.len() as u128 > DEFAULT_MAX_QUERY_BATCH_SIZE {
            ic_cdk::trap("Exceeds Max Query Batch Size")
        }
        token_ids.iter().map(|token_id| {
            let role_opt =  state.roles.get(&(*token_id as u64));
            if let Some(_) = role_opt {
                let mut metadata: HashMap<String, MetadataValue> = HashMap::new();
                metadata.insert("Name".into(), MetadataValue::Text(format!("Token {token_id}")));
                metadata.insert("Symbol".into(), MetadataValue::Text(format!("COM-{}", &ic_cdk::id().to_text()[0..5])));
                Some(metadata)
            } else {
                return None;
            }
        }).collect::<Vec<_>>()
    })
}

#[query]
pub fn icrc7_balance_of(accounts: Vec<Account>) -> Vec<u128> {
    STATE.with(|s| {
        let state = s.borrow();
        accounts.iter().map(|account| {
            // profile not exists
            let profile_id_opt =state.indexes.active_principal.get(&account.owner);
            if profile_id_opt.is_none() {
                return 0;
            }

            // is not a admin 
            let profile_id = profile_id_opt.unwrap();
            let roles_ids_opt = state.relations.profile_id_to_role_id.forward.get(profile_id);
            if roles_ids_opt.is_none() {
                return 0;
            }

            roles_ids_opt.unwrap().len() as u128
        }).collect::<Vec<_>>()
    })
}

#[query]
pub fn icrc7_tokens_of(account: Account, prev: Option<u128>, take: Option<u128>) -> Vec<u128> {
    STATE.with(|s| {
        let state: std::cell::Ref<'_, State> = s.borrow();
        let take = take.unwrap_or(DEFAULT_TAKE_VALUE);
        if take > DEFAULT_MAX_TAKE_VALUE {
            ic_cdk::trap("Exceeds Max Take Value")
        }
        // profile not exist
        let profile_id_opt = state.indexes.active_principal.get(&account.owner);
        if profile_id_opt.is_none() {
            return vec![];
        }

        // is not a admin 
        let profile_id = profile_id_opt.unwrap();
        let role_id_opt = state.relations.profile_id_to_role_id.forward.get(profile_id);
        if role_id_opt.is_none() {
            return vec![];
        }

        let role_ids = role_id_opt.unwrap().iter().map(|(id, _)| *id as u128).collect::<Vec<_>>();
        match prev {
            Some(prev) => match role_ids.iter().position(|id| *id == prev ) {
                None => vec![],
                Some(index) => role_ids.iter().map(|id| *id).skip(index).take(take as usize).collect(),
            },
            None => role_ids.iter().map(|id| *id).take(take as usize).collect::<Vec<_>>(),
        }
    })
}

#[update]
async fn mint(arg: MintArg) -> Result<u128, MintError> {
    // check the controller
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err(MintError::GenericBatchError {
            error_code: 100,
            message: "Anonymous Identity".into(),
        });
    }
    let (canister_status,) = canister_status(CanisterIdRecord { canister_id: ic_cdk::id() }).await.unwrap();

    if !canister_status.settings.controllers.contains(&caller) {
        return Err(MintError::GenericError { error_code: 1, message: "Unauthorized principal".to_owned() });
    }

    let mut canister_controllers = canister_status.settings.controllers.clone();

    let result = STATE.with(|s| {
        let mut state = s.borrow_mut();
        
        // check if caller has ntf
        let profile_id_caller = state.indexes.active_principal.get(&caller).unwrap();
        let role_id_caller_opt = state.relations.profile_id_to_role_id.forward.get(profile_id_caller);
        if role_id_caller_opt.is_none() {
            return Err(MintError::Unauthorized);
        }

        // check the to account has profile
        let profile_id_to_opt = state.indexes.active_principal.get(&arg.to.owner);
        let profile_id_to = if let Some(profile_id) = profile_id_to_opt {

            // check the to has already nft
            let role_id_to_opt = state.relations.profile_id_to_role_id.forward.get(&profile_id);
            if role_id_to_opt.is_some() {
                return Err(MintError::GenericError { error_code: 1, message: "Principal already has token".to_owned() });
            }

            profile_id.to_owned()
        } else {
            let profile_id  = uuid(&mut state);
            let profile = Profile { name:"".to_owned(), description: "".to_owned(), authentication: Authentication::Ic, active_principal: arg.to.owner.to_owned(), timestamp: ic_cdk::api::time(), last_login: ic_cdk::api::time() };
            state.profiles.insert(profile_id.to_owned(), profile);
            state.indexes.active_principal.insert(arg.to.owner.to_owned(), profile_id);
            state.indexes.profile.insert(AuthenticationWithAddress::Ic(IcParams { principal: arg.to.owner.to_owned() }), profile_id);
            profile_id
        };

        // insert the role 
        let role_id = uuid(&mut state);
        state.roles.insert(role_id, Role {timestamp: ic_cdk::api::time(), role: UserRole::Admin});
        state.relations.profile_id_to_role_id.insert(profile_id_to, role_id.to_owned());
        
        // insert tx 
        let caller_account = account_transformer(Account {
            owner: caller.clone(),
            subaccount: arg.from_subaccount,
        });

        let txn_id = log_transaction(
            &mut state,
            TransactionType::Mint {
                tid: role_id as u128,
                from: caller_account,
                to: arg.to,
                meta: MetadataValue::Text(format!("Community {}", &ic_cdk::id().to_text()[0..5])),
            },
            ic_cdk::api::time(),
            None,
        );

        Ok(txn_id)
    });
    if result.is_ok() {
        // Added to canister controllers
        canister_controllers.push(arg.to.owner);
    
        let update_setting_args = UpdateSettingsArgument {
            canister_id: ic_cdk::id(),
            settings: CanisterSettings{compute_allocation: None, memory_allocation: None, freezing_threshold: None, controllers: Some(canister_controllers), reserved_cycles_limit: None }
        };
        update_settings(update_setting_args).await.unwrap();
    }
    result
}

fn txn_deduplication_check(state: &RefMut<'_, State>, allowed_past_time: &u64, caller: &Account, args: &TransferArg) -> Result<(), TransferError> {
    let mut count = state.txn_log.len() as u128;
    while count != 0 {
        let txn = state.txn_log.get(&count).unwrap();
        if txn.ts < *allowed_past_time {
            return Ok(());
        }
        match txn.txn_type {
            TransactionType::Transfer {
                ref tid,
                ref from,
                ref to,
            } => {
                if &args.token_id == tid
                    && caller == from
                    && &args.to == to
                    && args.memo == txn.memo
                    && args.created_at_time == Some(txn.ts)
                {
                    return Err(TransferError::Duplicate {
                        duplicate_of: count,
                    });
                } else {
                    count -= 1;
                    continue;
                }
            }
            _ => {
                count -= 1;
                continue;
            }
        }
    }
    Ok(())
}

fn transfer_check(state: &RefMut<'_, State>, current_time: &u64, caller: &Account, arg: &TransferArg) -> Result<(), TransferError> {
    if let Some(time) = arg.created_at_time {
        let allowed_past_time = *current_time - DEFAULT_TX_WINDOW - DEFAULT_PERMITTED_DRIFT;
        let allowed_future_time = *current_time + DEFAULT_PERMITTED_DRIFT;
        if time < allowed_past_time {
            return Err(TransferError::TooOld);
        } else if time > allowed_future_time {
            return Err(TransferError::CreatedInFuture {
                ledger_time: current_time.clone(),
            });
        }
        txn_deduplication_check(state,&allowed_past_time, caller, arg)?;
    }
    // checking is token for the corresponding ID exists or not
    if state.roles.get(&(arg.token_id as u64)).is_none() {
        return Err(TransferError::NonExistingTokenId);
    }

    // checking if receiver and sender have same address
    if arg.to == *caller {
        return Err(TransferError::InvalidRecipient);
    }
    
    // checking if the caller is authorized to make transaction
    let (profile_id, _) = state.relations.profile_id_to_role_id.backward.get(&(arg.token_id as u64)).unwrap().first_key_value().unwrap();
    let owner_principal = state.profiles.get(profile_id).unwrap().active_principal;
    if owner_principal != caller.owner  {
        return Err(TransferError::Unauthorized);
    }

    // checking if the to account has already
    let to_profile_id_opt = state.indexes.active_principal.get(&arg.to.owner);
    if let Some(to_profile_id) = to_profile_id_opt {
        if state.relations.profile_id_to_role_id.forward.contains_key(to_profile_id) {
            return Err(TransferError::GenericBatchError { error_code: 1, message: "Principal already has token".to_owned() });
        }
    }
    
    Ok(())
}
#[update]
async fn icrc7_transfer(mut args: Vec<TransferArg>) -> Vec<Option<TransferResult>> {
    let caller = ic_cdk::caller();

    let (canister_status, ) = canister_status(CanisterIdRecord{canister_id: ic_cdk::id()}).await.unwrap();

    if !canister_status.settings.controllers.contains(&caller) {
        return vec![Some(Err(TransferError::GenericBatchError {
            error_code: 1,
            message: "Unauthorized principal".into(),
        }))];
    }
    let mut canister_controllers = canister_status.settings.controllers.clone();

    let result = STATE.with(|s| {
        let mut state = s.borrow_mut();

        // checking if the argument length in 0
        if args.is_empty() {
            return vec![Some(Err(TransferError::GenericBatchError {
                error_code: 1,
                message: "No Arguments Provided".into(),
            }))];
        }

        if args.len() as u128 > DEFAULT_MAX_UPDATE_BATCH_SIZE {
            return vec![Some(Err(TransferError::GenericBatchError { 
                error_code: 2, 
                message: "Exceed Max allowed Update Batch Size".into()
            }))];
        }
        
        if caller == Principal::anonymous() {
            return vec![Some(Err(TransferError::GenericBatchError {
                error_code: 100,
                message: "Anonymous Identity".into(),
            }))];
        }
        
        let mut txn_results = vec![None; args.len()];
        let current_time = ic_cdk::api::time();
        for (index, arg) in args.iter_mut().enumerate() {
            let caller_account = account_transformer(Account { owner: caller.clone(), subaccount: arg.from_subaccount});
            arg.to = account_transformer(arg.to);

            if let Err(e) = transfer_check(&state, &current_time, &caller_account, &arg) {
                txn_results[index]= Some(Err(e));
            }
        }

        for (index, arg) in args.iter().enumerate() {
            let caller_account = account_transformer(Account { owner: caller.clone(), subaccount: arg.from_subaccount });

            let time = arg.created_at_time.unwrap_or(current_time);

            if let Some(Err(e)) = txn_results.get(index).unwrap() {
                match e {
                    TransferError::GenericBatchError {
                        error_code: _,
                        message: _,
                    } => return txn_results,
                    _ => continue,
                }
            }

            let profile_ids = state.relations.profile_id_to_role_id.backward.get(&(arg.token_id as u64)).unwrap().to_owned();
            let (profile_id_prev_owner, _) = profile_ids.first_key_value().unwrap();
            let token_prev_owner = state.profiles.get(profile_id_prev_owner).unwrap().active_principal;

            let new_owner_profile_id =  if let Some(profile_id) = state.indexes.active_principal.get(&arg.to.owner) {
                profile_id.to_owned()
            } else {
                let profile_id  = uuid(&mut state);
                let profile = Profile { name:"".to_owned(), description: "".to_owned(), authentication: Authentication::Ic, active_principal: arg.to.owner.to_owned(), timestamp: ic_cdk::api::time(), last_login: ic_cdk::api::time() };
                state.profiles.insert(profile_id.to_owned(), profile);
                state.indexes.active_principal.insert(arg.to.owner.to_owned(), profile_id);
                state.indexes.profile.insert(AuthenticationWithAddress::Ic(IcParams { principal: arg.to.owner.to_owned() }), profile_id);
                profile_id
            };

            state.relations.profile_id_to_role_id.remove(profile_id_prev_owner.to_owned(), arg.token_id as u64);
            state.relations.profile_id_to_role_id.insert(new_owner_profile_id, arg.token_id as u64);

            // replace controllers
            let controller_index = canister_controllers.iter().position(|c| c == &token_prev_owner).unwrap();
            canister_controllers[controller_index] = arg.to.owner;

            let txn_id = log_transaction(
                &mut state,
                TransactionType::Transfer {
                    tid: arg.token_id,
                    from: caller_account.clone(),
                    to: arg.to.clone(),
                },
                time,
                None,
            );
            txn_results[index] = Some(Ok(txn_id));
        }
        txn_results
    });
    let update_setting_args = UpdateSettingsArgument {
        canister_id: ic_cdk::id(),
        settings: CanisterSettings{compute_allocation: None, memory_allocation: None, freezing_threshold: None, controllers: Some(canister_controllers), reserved_cycles_limit: None }
    };
    update_settings(update_setting_args).await.unwrap();

    result
}

fn burn_check(state: &RefMut<'_, State>,caller: &Account, arg: &BurnArg) -> Result<(), BurnError> {
    if let Some(ref memo) = arg.memo {
        if memo.len() as u128 > DEFAULT_MAX_MEMO_SIZE {
            return Err(BurnError::GenericError {
                error_code: 3,
                message: "Exceeds Max Memo Length".into(),
            });
        }
    }

    if !state.roles.contains_key(&(arg.token_id as u64)) {
        return Err(BurnError::NonExistingTokenId);
    }

    let (profile_id, _) = state.relations.profile_id_to_role_id.backward.get(&(arg.token_id as u64)).unwrap().first_key_value().unwrap();
    let owner_profile_id = state.indexes.active_principal.get(&caller.owner).unwrap();
    if profile_id != owner_profile_id {
        return Err(BurnError::Unauthorized);
    }

    Ok(())
}

#[update]
async fn burn(mut args: Vec<BurnArg>) -> Vec<Option<Result<u128, BurnError>>> {
    let caller = ic_cdk::caller();

    let (canister_status,) = canister_status(CanisterIdRecord { canister_id: ic_cdk::id() }).await.unwrap();

    if !canister_status.settings.controllers.contains(&caller) {
        return vec![Some(Err(BurnError::GenericBatchError {
            error_code: 1,
            message: "Unauthorized principal".into(),
        }))];
    }
    let mut canister_controllers = canister_status.settings.controllers.clone();

    let result = STATE.with(|s| {
        let mut state = s.borrow_mut();

        if args.is_empty() {
            return vec![Some(Err(BurnError::GenericBatchError {
                error_code: 1,
                message: "No Arguments Provided".into(),
            }))];
        }

        if caller == Principal::anonymous() {
            return vec![Some(Err(BurnError::GenericBatchError {
                error_code: 100,
                message: "Anonymous Identity".into(),
            }))];
        }

        let mut txn_results = vec![None; args.len()];
        for (index, arg) in args.iter_mut().enumerate() {
            let caller = account_transformer(Account {
                owner: caller.clone(),
                subaccount: arg.from_subaccount,
            });
            if let Err(e) = burn_check(&state, &caller, arg) {
                txn_results.insert(index, Some(Err(e)))
            }
        }

        for (index, arg) in args.iter().enumerate() {
           
            let burn_address = burn_account();
            if let Some(Err(e)) = txn_results.get(index).unwrap() {
                match e {
                    BurnError::GenericBatchError {
                        error_code: _,
                        message: _,
                    } => return txn_results,
                    _ => continue,
                }
            }
            state.roles.remove(&(arg.token_id as u64));
            let profile_id = state.indexes.active_principal.get(&caller).unwrap().clone();
            state.relations.profile_id_to_role_id.remove(profile_id, arg.token_id as u64);


            let caller = account_transformer(Account { owner: caller.clone(), subaccount: arg.from_subaccount });
            let tid = log_transaction(
                &mut state,
                TransactionType::Burn {
                    tid: arg.token_id,
                    from: caller,
                    to: burn_address,
                },
                ic_cdk::api::time(),
                arg.memo.clone(),
            );
            txn_results.insert(index, Some(Ok(tid)));

            let index = canister_controllers.iter().position(|c| c == &caller.owner).unwrap();
            canister_controllers.remove(index);
        }
        txn_results

    });

    let update_setting_args = UpdateSettingsArgument {
        canister_id: ic_cdk::id(),
        settings: CanisterSettings{compute_allocation: None, memory_allocation: None, freezing_threshold: None, controllers: Some(canister_controllers), reserved_cycles_limit: None }
    };
    update_settings(update_setting_args).await.unwrap();
    result
}

#[update]
async fn reset_tokens() -> Result<(), String> {
    // let caller = ic_cdk::caller();
    // let (canister_status, )= canister_status(CanisterIdRecord { canister_id: ic_cdk::id() }).await.unwrap();
    // if !canister_status.settings.controllers.iter().any(|c| c == &caller) {
    //     return Err("Unauthorized".to_owned());
    // }

    // STATE.with(|s| {
    //     let mut state = s.borrow_mut();
    //     let caller_account = default_account(&caller);
    //     let tokens= state.tokens.clone();
    //     for (token_id, _) in tokens.iter() {
    //         log_transaction(
    //             &mut state,
    //             TransactionType::Burn {
    //                 tid: token_id.to_owned(),
    //                 from: caller_account,
    //                 to: burn_account(),
    //             },
    //             ic_cdk::api::time(),
    //             None,
    //         );
    //     }
    //     state.tokens.clear();

    //     for controller in canister_status.settings.controllers.iter() {
    //         if controller == &ic_cdk::id() { continue; }
    //         let token_id = uuid(&mut state) as u128;
    //         let token_name = format!("{}", token_id);
    //         let token = Icrc7Token::new(token_id, token_name.to_owned(), None, None, default_account(controller));
    //         state.tokens.insert(token_id, token);
    //         log_transaction(
    //             &mut state,
    //             TransactionType::Mint { 
    //                 tid: token_id,
    //                 from: caller_account,
    //                 to: caller_account,
    //                 meta: MetadataValue::Text(token_name) 
    //             },
    //             ic_cdk::api::time(),
    //             None)
    //         ;
    //     }

    // });

    Ok(())
}