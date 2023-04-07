
### Deploy
```sh
DFX_NETWORK=ic dfx deploy parent --with-cycles 200000000000
```

### Upload
```sh
DFX_NETWORK=ic npm run upload:child
```

### Domain
```sh
curl -sLv -X POST -H 'Content-Type: application/json' https://icp0.io/registrations -d "{ \"name\": \"communities.ooo\" }"
```

