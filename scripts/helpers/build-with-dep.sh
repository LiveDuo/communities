rm -rf target/wasm32-unknown-unknown/release/.fingerprint/ic-certified-assets-6e0ebc7a13e172b9/
rm -rf target/wasm32-unknown-unknown/release/deps/ic_certified_assets-6e0ebc7a13e172b9.d # REMOVE? 
cargo build --target wasm32-unknown-unknown --package  parent --release