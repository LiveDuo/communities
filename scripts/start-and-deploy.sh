COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_RESET='\033[0m'

READY_STRING="Listening on http://127.0.0.1:8080/"

(dfx start --clean 2>&1 &) | while read output; do

    echo "${COLOR_GREEN}[1]${COLOR_RESET} $output"

    if [[ $output =~ $READY_STRING ]]; then
        sleep 1
        PREFIX="${COLOR_RED}[2]${COLOR_RESET}"
        PREFIX_ERR="${COLOR_RED}[ERR]${COLOR_RESET}"

        echo "$PREFIX Deploying ledger..."
        ./scripts/deploy-ledger.sh
        if [ $? -ne 0 ]; then echo "$PREFIX_ERR Deploy ledger failed"; exit 1; fi

        echo "$PREFIX Deploying CMC..."
        ./scripts/deploy-cmc.sh
        if [ $? -ne 0 ]; then echo "$PREFIX_ERR Deploy CMC failed"; exit 1; fi

        echo "$PREFIX Deploying parent..."
        dfx deploy parent --argument '(opt principal "'$(dfx canister id ledger)'")'
        if [ $? -ne 0 ]; then echo "$PREFIX_ERR Deploy parent failed"; exit 1; fi

        echo "$PREFIX Preparing assets..."
        ./scripts/prepare-assets.sh
        if [ $? -ne 0 ]; then echo "$PREFIX_ERR Prepare assets failed"; exit 1; fi

    fi

done

