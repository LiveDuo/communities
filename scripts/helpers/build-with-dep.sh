find target/wasm32-unknown-unknown/release/deps -name 'ic-certified-assets*' -delete
find target/wasm32-unknown-unknown/release/.fingerprint -name 'ic_certified_assets*' -delete
cargo build --target wasm32-unknown-unknown --package  parent --release