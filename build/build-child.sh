# Usage: VERSION="0.0.1" npm run build:wasm

# build child wasm
cargo build --target wasm32-unknown-unknown --package  child --release
ic-cdk-optimizer target/wasm32-unknown-unknown/release/child.wasm -o target/wasm32-unknown-unknown/release/child_opt.wasm

# copy to build folder
_VERSION="${VERSION:=latest}"
mkdir -p build/child/$_VERSION
cp target/wasm32-unknown-unknown/release/child_opt.wasm  build/child/$_VERSION/child.wasm

