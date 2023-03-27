### Prepare
1. update in ic-certified-assets dependency Cargo.toml

### Development
1. edit ~/.cargo/checkouts/cdk-rs-.../../src/ic-certified-assets/lib.rs 
2. dfx deploy parent --mode reinstall && icx-asset --pem ~/.config/dfx/identity/default/identity.pem upload $(dfx canister id parent) /child/child.wasm=./build/canister/child.wasm
3. dfx canister call parent test
