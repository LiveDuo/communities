
# build child wasm
cargo build --target wasm32-unknown-unknown --package  child --release
ic-wasm target/wasm32-unknown-unknown/release/child.wasm -o target/wasm32-unknown-unknown/release/child_opt.wasm shrink

# copy to build folder
mkdir -p build/child/latest
cp target/wasm32-unknown-unknown/release/child_opt.wasm  build/child/latest/child.wasm

