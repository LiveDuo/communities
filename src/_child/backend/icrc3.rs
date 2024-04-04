use candid::CandidType;
use serde::{Serialize, Deserialize};
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc::generic_metadata_value::MetadataValue;
use std::cell::RefMut;
use crate::state::State;

pub const DEFAULT_TX_WINDOW: u64 = 24 * 60 * 60 * 1000_000_000;
pub const DEFAULT_PERMITTED_DRIFT: u64 = 2 * 60 * 1000_000_000;

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub enum TransactionType {
    Mint {
        tid: u128,
        from: Account,
        to: Account,
        meta: MetadataValue,
    },
    Burn {
        tid: u128,
        from: Account,
        to: Account,
    },
    Transfer {
        tid: u128,
        from: Account,
        to: Account,
    },
}

#[derive(CandidType, Serialize, Deserialize, Debug, Clone)]
pub struct Transaction {
    pub ts: u64,
    pub txn_id: u128,
    pub op: String,
    pub txn_type: TransactionType,
    pub memo: Option<Vec<u8>>,
}


impl Transaction {
    pub fn new(txn_id: u128, txn_type: TransactionType, ts: u64, memo: Option<Vec<u8>>) -> Self {
        let op = match &txn_type {
            TransactionType::Transfer {
                tid: _,
                from: _,
                to: _,
            } => "7xfer".into(),
            TransactionType::Mint {
                tid: _,
                from: _,
                to: _,
                meta: _,
            } => "7mint".into(),
            TransactionType::Burn {
                tid: _,
                from: _,
                to: _,
            } => "7burn".into(),
        };
        Self {
            op,
            txn_id,
            ts,
            txn_type,
            memo,
        }
    }
}

pub fn log_transaction(state: &mut RefMut<'_, State>, txn_type: TransactionType, ts: u64, memo: Option<Vec<u8>>) -> u128 {
    let txn_id = (state.txn_log.len() + 1) as u128;
    let txn = Transaction::new(txn_id, txn_type, ts, memo);
    state.txn_log.insert( txn_id, txn);
    txn_id
}
