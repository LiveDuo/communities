
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

Verify: `curl -sLv -X GET https://icp0.io/registrations/1811bd1d1c3755910f3f15ab1ef33115f16c1e54d20d0e304f940858f4670ce1`
