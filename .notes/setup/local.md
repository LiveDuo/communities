
### Setup dfx network

```json
{
  "local": {
    "bind": "127.0.0.1:8000",
    "type": "ephemeral",
    "replica": {
      "subnet_type": "system"
    }
  }
}
```
**Location:** `~/.config/dfx/networks.json`


### Setup child with upgrades

1. `dfx deploy parent`
2. `npm run upload:parent-minimal`
3. `dfx canister call parent create_child`
4. add child canister id to `./config-overrides.js`
5. `npm run dev:child`
6. (optional) `node src/_parent/upload-upgrade.js`

