//! This module declares canister methods expected by the assets canister client.
pub mod rc_bytes;
pub mod state_machine;
pub mod types;
mod url_decode;

#[cfg(test)]
mod tests;

pub use crate::state_machine::StableState;
use crate::{
    rc_bytes::RcBytes,
    state_machine::{AssetDetails, EncodedAsset, State},
    types::*,
};
use candid::{candid_method, Principal, Nat};
use ic_cdk::api::{caller, data_certificate, set_certified_data, time, trap};
use ic_cdk::{query, update};
use std::cell::RefCell;

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

#[update]
#[candid_method(update)]
fn authorize(other: Principal) {
    let caller = caller();
    STATE.with(|s| {
        if let Err(msg) = s.borrow_mut().authorize(&caller, other) {
            trap(&msg);
        }
    })
}

#[query]
#[candid_method(query)]
pub fn retrieve(key: Key) -> RcBytes {
    STATE.with(|s| match s.borrow().retrieve(&key) {
        Ok(bytes) => bytes,
        Err(msg) => trap(&msg),
    })
}

#[query]
#[candid_method(query)]
pub fn retrieve_batch(assets: Vec<GetChunkArg>) -> Vec<(Key, bool, Vec<u8>)> {
    STATE.with(|s| {
        let state = s.borrow();

        // get batches
        let mut batches: Vec<(u32, Vec<(Key, bool, Vec<u8>)>)> = vec![(0, vec![])];
        for asset  in assets {
            
            let content = state.get_chunk(asset.to_owned()).unwrap().to_vec();
            let chuck_len = state.get_chunk_len(&asset.key, &asset.content_encoding).unwrap();
            let has_more_chunks = Nat::from(chuck_len - 1) > asset.index;
            
            let mut is_stored_already = false;
            for (batch_size, batch) in batches.iter_mut() {
                if *batch_size + content.len() as u32 <= MAX_MESSAGE_SIZE  {
                    *batch_size+= content.len() as u32;
                    batch.push((asset.key.clone(),has_more_chunks, content.to_owned()));
                    is_stored_already = true;
                    break;
                }
            }
            if !is_stored_already  {
                batches.push((content.len() as u32, vec![(asset.key, has_more_chunks, content)]));
            }
        }

        // return the largest batch
        let mut batch_index_max = 0;
        let mut batch_size_max = 0;
        for (batch_index,(batch_size, _))  in batches.iter().enumerate() {
            if *batch_size > batch_size_max {
                batch_size_max = *batch_size;
                batch_index_max = batch_index;
            }
        }
        let (_, batch) = &batches[batch_index_max];
        batch.clone()
    })
}

#[update(guard = "is_authorized")]
#[candid_method(update)]
pub fn store(arg: StoreArg) {
    STATE.with(move |s| {
        if let Err(msg) = s.borrow_mut().store(arg, time()) {
            trap(&msg);
        }
        set_certified_data(&s.borrow().root_hash());
    });
}

#[update(guard = "is_authorized")]
#[candid_method(update)]
pub fn create_batch() -> CreateBatchResponse {
    STATE.with(|s| CreateBatchResponse {
        batch_id: s.borrow_mut().create_batch(time()),
    })
}

#[update(guard = "is_authorized")]
#[candid_method(update)]
pub fn create_chunk(arg: CreateChunkArg) -> CreateChunkResponse {
    STATE.with(|s| match s.borrow_mut().create_chunk(arg, time()) {
        Ok(chunk_id) => CreateChunkResponse { chunk_id },
        Err(msg) => trap(&msg),
    })
}

#[update(guard = "is_authorized")]
#[candid_method(update)]
fn create_asset(arg: CreateAssetArguments) {
    STATE.with(|s| {
        if let Err(msg) = s.borrow_mut().create_asset(arg) {
            trap(&msg);
        }
        set_certified_data(&s.borrow().root_hash());
    })
}

#[update(guard = "is_authorized")]
#[candid_method(update)]
pub fn set_asset_content(arg: SetAssetContentArguments) {
    STATE.with(|s| {
        if let Err(msg) = s.borrow_mut().set_asset_content(arg, time()) {
            trap(&msg);
        }
        set_certified_data(&s.borrow().root_hash());
    })
}

#[update(guard = "is_authorized")]
#[candid_method(update)]
pub fn unset_asset_content(arg: UnsetAssetContentArguments) {
    STATE.with(|s| {
        if let Err(msg) = s.borrow_mut().unset_asset_content(arg) {
            trap(&msg);
        }
        set_certified_data(&s.borrow().root_hash());
    })
}

#[update(guard = "is_authorized")]
#[candid_method(update)]
pub fn delete_asset(arg: DeleteAssetArguments) {
    STATE.with(|s| {
        s.borrow_mut().delete_asset(arg);
        set_certified_data(&s.borrow().root_hash());
    });
}

#[update(guard = "is_authorized")]
#[candid_method(update)]
pub fn clear() {
    STATE.with(|s| {
        s.borrow_mut().clear();
        set_certified_data(&s.borrow().root_hash());
    });
}

#[update(guard = "is_authorized")]
#[candid_method(update)]
pub fn commit_batch(arg: CommitBatchArguments) {
    STATE.with(|s| {
        if let Err(msg) = s.borrow_mut().commit_batch(arg, time()) {
            trap(&msg);
        }
        set_certified_data(&s.borrow().root_hash());
    });
}


#[update(guard = "is_authorized")]
#[candid_method(update)]
pub fn execute_batch(arg: Vec<BatchOperation>) {
    STATE.with(|s| {
        let now = time();
        let mut state = s.borrow_mut();
        let batch_id = state.create_batch(now);
        let commit_batch = CommitBatchArguments {batch_id, operations: arg};
        if let Err(msg) = state.commit_batch(commit_batch, now) {
            trap(&msg);
        }
        set_certified_data(&state.root_hash());
    });
}

#[query]
#[candid_method(query)]
pub fn get(arg: GetArg) -> EncodedAsset {
    STATE.with(|s| match s.borrow().get(arg) {
        Ok(asset) => asset,
        Err(msg) => trap(&msg),
    })
}

#[query]
#[candid_method(query)]
pub fn get_chunk(arg: GetChunkArg) -> GetChunkResponse {
    STATE.with(|s| match s.borrow().get_chunk(arg) {
        Ok(content) => GetChunkResponse { content },
        Err(msg) => trap(&msg),
    })
}

#[query]
#[candid_method(query)]
pub fn list() -> Vec<AssetDetails> {
    STATE.with(|s| s.borrow().list_assets())
}

#[query]
#[candid_method(query)]
pub fn exists(key: Key) -> bool{
    STATE.with(|s| s.borrow().exists(&key))
}

// #[query]
// #[candid_method(query)]
fn http_request(req: HttpRequest) -> HttpResponse {
    let certificate = data_certificate().unwrap_or_else(|| trap("no data certificate available"));

    STATE.with(|s| {
        s.borrow().http_request(
            req,
            &certificate,
            CallbackFunc::new(ic_cdk::id(), "http_request_streaming_callback".to_string())
        )
    })
}

pub fn http_request_handle(req: HttpRequest) -> HttpResponse {
    return http_request(req);
}

// #[query]
// #[candid_method(query)]
fn http_request_streaming_callback(token: StreamingCallbackToken) -> StreamingCallbackHttpResponse {
    STATE.with(|s| {
        s.borrow()
            .http_request_streaming_callback(token)
            .unwrap_or_else(|msg| trap(&msg))
    })
}

pub fn http_request_streaming_callback_handle(token: StreamingCallbackToken) -> StreamingCallbackHttpResponse {
    return http_request_streaming_callback(token);
}

fn is_authorized() -> Result<(), String> {
    STATE.with(|s| {
        s.borrow()
            .is_authorized(&caller())
            .then(|| ())
            .ok_or_else(|| "Caller is not authorized".to_string())
    })
}

pub fn init() {
    STATE.with(|s| {
        let mut s = s.borrow_mut();
        s.clear();
        s.authorize_unconditionally(caller());
    });
}

pub fn pre_upgrade() -> StableState {
    STATE.with(|s| s.take().into())
}

pub fn post_upgrade(stable_state: StableState) {
    STATE.with(|s| {
        *s.borrow_mut() = State::from(stable_state);
        set_certified_data(&s.borrow().root_hash());
    });
}

#[test]
fn candid_interface_compatibility() {
    use candid_parser::utils::{service_compatible, CandidSource};
    use std::path::PathBuf;

    candid::export_service!();
    let new_interface = __export_service();

    let old_interface =
        PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("assets.did");

    println!("Exported interface: {}", new_interface);

    service_compatible(
        CandidSource::Text(&new_interface),
        CandidSource::File(old_interface.as_path()),
    )
    .expect("The assets canister interface is not compatible with the assets.did file");
}

