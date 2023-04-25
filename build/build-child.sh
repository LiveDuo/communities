
# build child wasm
cargo build --target wasm32-unknown-unknown --package  child --release
ic-cdk-optimizer target/wasm32-unknown-unknown/release/child.wasm -o target/wasm32-unknown-unknown/release/child_opt.wasm
cp target/wasm32-unknown-unknown/release/child_opt.wasm  $SAVE_PATH
