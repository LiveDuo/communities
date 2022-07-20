use ic_cdk::export::candid::{candid_method, export_service};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade};

#[init]
fn init() {
    ic_certified_assets::init();
}

#[ic_cdk_macros::query]
#[candid_method(query)]
fn greet(name: String) -> String {
  format!("Hello, {}!", name)
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::storage::stable_save((ic_certified_assets::pre_upgrade(),))
        .expect("failed to save stable state");
}

#[post_upgrade]
fn post_upgrade() {
    let (stable_state,): (ic_certified_assets::StableState,) =
        ic_cdk::storage::stable_restore().expect("failed to restore stable state");
    ic_certified_assets::post_upgrade(stable_state);
}

export_service!();

#[ic_cdk_macros::query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
  __export_service()
}
