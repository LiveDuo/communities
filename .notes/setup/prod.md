
### Deploy
```sh
dfx deploy parent --with-cycles 200000000000 --network ic --mode reinstall # mode = install, upgrade, reinstall
```

### Upload
```sh
CRA_MODE=production npm run build:parent
node src/_parent/upload-assets.js --network https://ic0.app --identity with-wallet
```

### Domain
```sh
curl -sLv -X POST -H 'Content-Type: application/json' https://icp0.io/registrations -d "{ \"name\": \"www.communities.ooo\" }"
```

Verify: `curl -sLv -X GET https://icp0.io/registrations/e96a86912e30019fb63fa9abb96d07efa79856879513762184dff0f3cedcead3`

### Controllers

```sh
dfx canister --network ic call aaaaa-aa update_settings '(record { canister_id = principal "..."; settings = record { controllers = opt vec { ... }; }; })'

dfx canister --network ic call aaaaa-aa canister_status '(record { canister_id = principal "..."; })'
```

