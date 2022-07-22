
# build backend wasm
cargo build --target wasm32-unknown-unknown --package  backend --release
ic-cdk-optimizer target/wasm32-unknown-unknown/release/backend.wasm -o target/wasm32-unknown-unknown/release/backend_opt.wasm
cp target/wasm32-unknown-unknown/release/backend_opt.wasm canisters/backend.wasm
