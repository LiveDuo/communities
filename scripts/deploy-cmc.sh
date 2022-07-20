
# deploy cmc canister
LEDGER="$(dfx canister id ledger)"
GOVERNANCE="aaaaa-aa"
if [ "$LEDGER" = "" ]; then exit 0; fi
dfx deploy cmc --argument '(record { governance_canister_id = principal "'${GOVERNANCE}'"; ledger_canister_id = principal "'${LEDGER}'"; last_purged_notification = opt 1 })'
