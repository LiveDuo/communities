
# Upload asset to path 

### via canister call

- Encode body content
```sh
node -e "console.log('vec {' + '<\!DOCTYPE html>\n<html>\n<body>\n<h3>This is a header</h3>\n</body>\n</html>\n'.split('').map(r => r.charCodeAt(0)).join('; ') + '}')"
```

- Call the canister
```sh
dfx canister call $(dfx canister id child) store '(record { key = "/custom.html"; content_type = "text/html"; content_encoding = "identity"; content = PLACEHOLDER; })'
```

### via icx-package

- Create identity pem file
```sh
dfx identity export default
```

- Call the canister
```sh
~/.cargo/bin/icx-asset --pem key.pem upload $(dfx canister id child) ./assets/index.html
```

**Note:** In order to not use the pem file, authorize anonymous identity.

# Authorize anonymous

- Authorize anonymous
```sh
dfx canister call $(dfx canister id child) authorize 'principal "2vxsx-fae"'
```

**Example**
dfx canister call $(dfx canister id child) store '(record { key = "/custom.html"; content_type = "text/html"; content_encoding = "identity"; content = vec {60; 33; 68; 79; 67; 84; 89; 80; 69; 32; 104; 116; 109; 108; 62; 10; 60; 104; 116; 109; 108; 62; 10; 60; 98; 111; 100; 121; 62; 10; 60; 104; 51; 62; 84; 104; 105; 115; 32; 105; 115; 32; 97; 32; 104; 101; 97; 100; 101; 114; 60; 47; 104; 51; 62; 10; 60; 47; 98; 111; 100; 121; 62; 10; 60; 47; 104; 116; 109; 108; 62; 10}; })'


### Resources
https://github.com/Astrapolis/ICHub/blob/44768d891b1956f49587eecc7d28051ead2fde34/src/hub/src/lib.rs
https://github.com/ocluf/Candao/blob/main/src/candao/src/main.rs
https://github.com/AstroxNetwork/FoxIC/blob/main/canisters/foxic_factory/src/factory.rs

