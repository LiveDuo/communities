use ic_cdk::export::candid::{export_service};

use candid::{Principal};

mod canister;
mod helpers;

export_service!();

#[ic_cdk_macros::query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
  __export_service()
}
