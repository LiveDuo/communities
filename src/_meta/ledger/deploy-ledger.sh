
# use private ledger candid interface
contents="$(jq '.canisters.ledger.candid = "src/_meta/ledger/ledger.private.did"' dfx.json)"
echo "${contents}" > dfx.json

# deploy ledger canister
USER="$(dfx ledger account-id)"
MINTER="34cf47ac751b6393362ba030cfec1d2ff9218f1c901fe990b1e1919b5b902e51" ## a random account ie. not the caller
dfx deploy ledger --argument '(record {minting_account = "'${MINTER}'"; initial_values = vec { record { "'${USER}'"; record { e8s=100_000_000_000 } }; }; send_whitelist = vec {}})'

# use public ledger candid interface
contents="$(jq '.canisters.ledger.candid = "src/_meta/ledger/ledger.public.did"' dfx.json)"
echo "${contents}" > dfx.json
