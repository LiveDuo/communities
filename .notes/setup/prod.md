
### Deploy
```sh
DFX_NETWORK=ic dfx deploy parent --with-cycles 200000000000
```

### Upload
```sh
node src/_parent/upload-assets.js --network https://ic0.app --identity with-wallet
```

### Domain
```sh
curl -sLv -X POST -H 'Content-Type: application/json' https://icp0.io/registrations -d "{ \"name\": \"communities.ooo\" }"
```

