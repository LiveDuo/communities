use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};
use ic_cdk::{query, update};

use icrc_ledger_types::icrc1::account::{Subaccount, Account};
use icrc_ledger_types::icrc::generic_metadata_value::MetadataValue;
use ic_cdk::api::management_canister::main::{canister_status, update_settings, CanisterIdRecord, UpdateSettingsArgument, CanisterSettings};

use std::collections::HashMap;
use std::cell::RefMut;
use crate::utils::{account_transformer, uuid, burn_account, default_account};
use crate::state::{STATE, State};
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
    // if None, then the combination of Collection's symbol and token's id will be provided
    // for e.g.: "ICRC7 100"
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

pub type MintResult = Result<u128, MintError>;

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

pub type BurnResult = Result<u128, BurnError>;

#[derive(CandidType)]
pub struct Standard {
    pub name: String,
    pub url: String,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Icrc7Token {
    pub token_id: u128,
    pub token_name: String,
    pub token_description: Option<String>,
    pub token_logo: Option<String>,
    pub token_owner: Account,
}

impl Icrc7Token {
    pub fn new(
        token_id: u128,
        token_name: String,
        token_description: Option<String>,
        token_logo: Option<String>,
        token_owner: Account,
    ) -> Self {
        Self {
            token_id,
            token_name,
            token_logo,
            token_owner,
            token_description,
        }
    }

    pub fn transfer(&mut self, to: Account) {
        self.token_owner = to;
    }

    pub fn token_metadata(&self) -> Icrc7TokenMetadata {
        let mut metadata = HashMap::<String, MetadataValue>::new();
        metadata.insert("Name".into(), MetadataValue::Text(self.token_name.clone()));
        metadata.insert(
            "Symbol".into(),
            MetadataValue::Text(self.token_name.clone()),
        );
        if let Some(ref description) = self.token_description {
            metadata.insert(
                "Description".into(),
                MetadataValue::Text(description.clone()),
            );
        }
        if let Some(ref logo) = self.token_logo {
            metadata.insert("logo".into(), MetadataValue::Text(logo.clone()));
        }
        metadata
    }

    pub fn burn(&mut self, burn_address: Account) {
        self.token_owner = burn_address;
    }
}



#[query]
pub fn icrc7_symbol() -> String {
   "ICRC7".to_owned()
}

#[query]
pub fn icrc7_name() -> String {
   "ICRC7 Collection".to_owned()
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
    STATE.with(|s| s.borrow().tokens.len() as u128)
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

        let mut res = vec![None; ids.len()];
        for (index, id) in ids.iter().enumerate() {
            if let Some(ref token) = state.tokens.get(id) {
                res.insert(index, Some(token.token_owner))
            }
        }
        res
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
        let mut list: Vec<u128> = state.tokens.iter().map(|(k, _)| k.to_owned()).collect();
        list.sort();
        match prev {
            Some(prev) => match list.iter().position(|id| *id == prev) {
                None => vec![],
                Some(index) => list
                    .iter()
                    .map(|id| *id)
                    .skip(index)
                    .take(take as usize)
                    .collect(),
            },
            None => list[0..take as usize].to_vec(),
        }
    })
}

#[query]
pub fn icrc7_token_metadata(token_ids: Vec<u128>) -> Vec<Option<Icrc7TokenMetadata>> {
    STATE.with(|s| {
        let state = s.borrow();
        if token_ids.len() as u128 > DEFAULT_MAX_QUERY_BATCH_SIZE {
            ic_cdk::trap("Exceeds Max Query Batch Size")
        }
        let mut metadata_list = vec![None; token_ids.len()];
        for (index, tid) in token_ids.iter().enumerate() {
            if let Some(ref token) = state.tokens.get(tid) {
                metadata_list.insert(index, Some(token.token_metadata()))
            }
        }
        metadata_list
    })
}

#[query]
pub fn icrc7_balance_of(accounts: Vec<Account>) -> Vec<u128> {
    STATE.with(|s| {
        let state = s.borrow();
        let mut count_list = vec![0; accounts.len()];
        accounts.iter().enumerate().for_each(|(index, account)| {
            state.tokens.iter().for_each(|(_id, ref token)| {
                if token.token_owner == *account {
                    let current_count = count_list[index];
                    count_list[index] = current_count + 1;
                }
            })
        });
        count_list
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
        let mut owned_tokens = vec![];
        for (id, token) in state.tokens.iter() {
            if token.token_owner == account {
                owned_tokens.push(id.to_owned());
            }
        }
        owned_tokens.sort();
        match prev {
            None => owned_tokens[0..=take as usize].to_vec(),
            Some(prev) => match owned_tokens.iter().position(|id| *id == prev) {
                None => vec![],
                Some(index) => owned_tokens
                    .iter()
                    .map(|id| *id)
                    .skip(index)
                    .take(take as usize)
                    .collect(),
            },
        }
    })
}

#[update]
async fn mint(mut arg: MintArg) -> MintResult {
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
        let caller_account = account_transformer(Account {
            owner: caller.clone(),
            subaccount: arg.from_subaccount,
        });
        arg.to = account_transformer(arg.to);
        
        if !state.tokens.iter().any(|(_, a)|a.token_owner == caller_account) {
            return Err(MintError::Unauthorized);
        }

        if state.tokens.iter().any(|(_, a)| a.token_owner.owner == arg.to.owner) {
            return Err(MintError::GenericError { error_code: 1, message: "Principal already has token".to_owned() });
        }

        if let Some(ref memo) = arg.memo {
            if memo.len() as u128 > DEFAULT_MAX_MEMO_SIZE {
                return Err(MintError::GenericError {
                    error_code: 7,
                    message: "Exceeds Allowed Memo Length".into(),
                });
            }
        }
        if let Some(_) = state.tokens.get(&arg.token_id) {
            return Err(MintError::TokenIdAlreadyExist);
        }

        let token_name = arg.token_name.unwrap_or_else(|| {
            let name = format!("{}", arg.token_id);
            name
        });
        let token_id = uuid(&caller.to_text()) as u128;
        let token = Icrc7Token::new(
            token_id,
            token_name.clone(),
            arg.token_description.clone(),
            arg.token_logo,
            arg.to.clone(),
        );
        state.tokens.insert(token_id, token);
        let txn_id = log_transaction(
            &mut state,
            TransactionType::Mint {
                tid: token_id,
                from: caller_account,
                to: arg.to,
                meta: MetadataValue::Text(arg.token_description.unwrap_or(token_name)),
            },
            ic_cdk::api::time(),
            arg.memo,
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
    let mut count = state.txn_count;
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

fn mock_transfer(state: &RefMut<'_, State>, current_time: &u64, caller: &Account, arg: &TransferArg) -> Result<(), TransferError> {
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
    if let None = state.tokens.get(&arg.token_id) {
        return Err(TransferError::NonExistingTokenId);
    }
    if let Some(ref memo) = arg.memo {
        if memo.len() as u128 > DEFAULT_MAX_MEMO_SIZE {
            return Err(TransferError::GenericError {
                error_code: 3,
                message: "Exceeds Max Memo Size".into(),
            });
        }
    }
    // checking if receiver and sender have same address
    if arg.to == *caller {
        return Err(TransferError::InvalidRecipient);
    }
    let token = state.tokens.get(&arg.token_id).unwrap();
    // checking if the caller is authorized to make transaction
    if token.token_owner != *caller {
        return Err(TransferError::Unauthorized);
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
        if args.len() == 0 {
            return vec![Some(Err(TransferError::GenericBatchError {
                error_code: 1,
                message: "No Arguments Provided".into(),
            }))];
        }
        let mut txn_results = vec![None; args.len()];
        if args.len() as u128 > DEFAULT_MAX_UPDATE_BATCH_SIZE {
            txn_results[0] = Some(Err(TransferError::GenericBatchError {
                error_code: 2,
                message: "Exceed Max allowed Update Batch Size".into(),
            }));
            return txn_results;
        }
        if caller == Principal::anonymous() {
            txn_results[0] = Some(Err(TransferError::GenericBatchError {
                error_code: 100,
                message: "Anonymous Identity".into(),
            }));
            return txn_results;
        }
        let current_time = ic_cdk::api::time();
        for (index, arg) in args.iter_mut().enumerate() {
            let caller_account = account_transformer(Account {
                owner: caller.clone(),
                subaccount: arg.from_subaccount,
            });
            arg.to = account_transformer(arg.to);
            if let Err(e) = mock_transfer(&state,&current_time, &caller_account, &arg) {
                txn_results[index] = Some(Err(e));
            }
        }
        for (index, arg) in args.iter().enumerate() {
            let caller_account = account_transformer(Account {
                owner: caller.clone(),
                subaccount: arg.from_subaccount,
            });
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
            let mut token = state.tokens.get(&arg.token_id).unwrap().to_owned();
            let token_prev_owner = token.token_owner.clone();
            token.transfer(arg.to.clone());
            state.tokens.insert(arg.token_id, token.to_owned());
            // replace controllers
            let controller_index = canister_controllers.iter().position(|c| c == &token_prev_owner.owner).unwrap();
            canister_controllers[controller_index] = token.token_owner.owner;
            let txn_id = log_transaction(
                &mut state,
                TransactionType::Transfer {
                    tid: arg.token_id,
                    from: caller_account.clone(),
                    to: arg.to.clone(),
                },
                time,
                arg.memo.clone(),
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

fn mock_burn(state: &RefMut<'_, State>,caller: &Account, arg: &BurnArg) -> Result<(), BurnError> {
    if let Some(ref memo) = arg.memo {
        if memo.len() as u128 > DEFAULT_MAX_MEMO_SIZE {
            return Err(BurnError::GenericError {
                error_code: 3,
                message: "Exceeds Max Memo Length".into(),
            });
        }
    }
    match state.tokens.get(&arg.token_id) {
        None => Err(BurnError::NonExistingTokenId),
        Some(ref token) => {
            if token.token_owner != *caller {
                return Err(BurnError::Unauthorized);
            }
            Ok(())
        }
    }
}

#[update]
async fn burn(mut args: Vec<BurnArg>) -> Vec<Option<BurnResult>> {
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
        if args.len() == 0 {
            return vec![Some(Err(BurnError::GenericBatchError {
                error_code: 1,
                message: "No Arguments Provided".into(),
            }))];
        }
        let mut txn_results = vec![None; args.len()];
        if caller == Principal::anonymous() {
            txn_results[0] = Some(Err(BurnError::GenericBatchError {
                error_code: 100,
                message: "Anonymous Identity".into(),
            }));
            return txn_results;
        }
        for (index, arg) in args.iter_mut().enumerate() {
            let caller = account_transformer(Account {
                owner: caller.clone(),
                subaccount: arg.from_subaccount,
            });
            if let Err(e) = mock_burn(&state, &caller, arg) {
                txn_results.insert(index, Some(Err(e)))
            }
        }
        for (index, arg) in args.iter().enumerate() {
            let caller = account_transformer(Account {
                owner: caller.clone(),
                subaccount: arg.from_subaccount,
            });
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
            state.tokens.remove(&arg.token_id);
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
async fn reset_tokes() -> Result<(), String> {
    let caller = ic_cdk::caller();
    let (canister_status, )= canister_status(CanisterIdRecord { canister_id: ic_cdk::id() }).await.unwrap();
    if !canister_status.settings.controllers.iter().any(|c| c == &caller) {
        return Err("Unauthorized".to_owned());
    }

    STATE.with(|s| {
        let mut state = s.borrow_mut();
        let caller_account = default_account(&caller);
        let tokens= state.tokens.clone();
        for (token_id, _) in tokens.iter() {
            log_transaction(
                &mut state,
                TransactionType::Burn {
                    tid: token_id.to_owned(),
                    from: caller_account,
                    to: burn_account(),
                },
                ic_cdk::api::time(),
                None,
            );
        }
        state.tokens.clear();

        for controller in canister_status.settings.controllers.iter() {
            if controller == &ic_cdk::id() { continue; }
            let token_id = uuid(&controller.to_text()) as u128;
            let token_name = format!("{}", token_id);
            let token = Icrc7Token::new(token_id, token_name.to_owned(), None, None, default_account(controller));
            state.tokens.insert(token_id, token);
            log_transaction(
                &mut state,
                TransactionType::Mint { 
                    tid: token_id,
                    from: caller_account,
                    to: caller_account,
                    meta: MetadataValue::Text(token_name) 
                },
                ic_cdk::api::time(),
                None)
            ;
        }

    });

    Ok(())
}