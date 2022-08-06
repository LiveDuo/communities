COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_RESET='\033[0m'

READY_STRING="Listening on http://127.0.0.1:8000/"

(dfx start --clean 2>&1 &) | while read output; do

    echo "${COLOR_GREEN}[1]${COLOR_RESET} $output"

    if [[ $output =~ $READY_STRING ]]; then
        sleep 1
        PREFIX="${COLOR_RED}[2]${COLOR_RESET}"
        PREFIX_ERR="${COLOR_RED}[ERR]${COLOR_RESET}"

        echo "$PREFIX Preparing wasm..."
        ./scripts/prepare-wasm.sh
        if [ $? -ne 0 ]; then echo "$PREFIX_ERR Prepare wasm failed"; exit 1; fi

        echo "$PREFIX Deploying deployer..."
        dfx deploy deployer
        if [ $? -ne 0 ]; then echo "$PREFIX_ERR Deploy deployer failed"; exit 1; fi

        echo "$PREFIX Preparing assets..."
        icx-asset --pem ~/.config/dfx/identity/default/identity.pem upload $(dfx canister id deployer) /child/child.wasm=./canisters/child.wasm
        if [ $? -ne 0 ]; then echo "$PREFIX_ERR Prepare assets failed"; exit 1; fi
        
        echo "$PREFIX Deploying child..."
        dfx canister call deployer create_child_canister
        if [ $? -ne 0 ]; then echo "$PREFIX_ERR Deploy child failed"; exit 1; fi
    fi

done

