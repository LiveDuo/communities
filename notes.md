

----------------------------
  Pending
----------------------------


----------------------------
  Done
----------------------------
Build folder path 
- Child 
    - Least -> with frontend and wasm 
    - Version -> with frontend and wasm
NOTE: fixing the build file of wasm to get the path from 

upload-upgrade script
	- version in variable like others ✅
	- create_upgrade
		- get the hash of wasm not the whole wasm https://remarkablemark.medium.com/how-to-generate-a-sha-256-hash-with-javascript-d3b2696382fd ✅
  - create endpoint to parent canister to return all the available upgrades ✅
  - call this script like external with https://nodejs.org/api/child_process.html 

Test upgrade
  - upgrade_canister
    - throw err when parent_id is None ✅
    - move login about parent_id in store_assets ✅
    - build the of wasm key from temp folder ✅
  - get_next_upgrade
    - if parent_opt or current_version_opt is None throw err ✅
    - 490 build path from version ✅
  - install_assets
    - rename install_assets to replace_assets ✅
    - the condition is start_with temp ✅
    - 462 464 in struck ✅
NOTE: 
  - upgrade_canister
    - send wasm hash
    - parent endpoint to get upgrade_by_hash








## build from latest
VERSION="0.0.1" npm run build:wasm
VERSION="broken" npm run build:wasm

## upgrade version 0.0.2
VERSION="0.0.2" npm run build:wasm
 

dfx deploy -m reinstall parent 
dfx deploy parent 

npm run upload:parent

npm run test:upgrade



dfx canister call qoctq-giaaa-aaaaa-aaaea-cai test_fn


#[update]
fn test_fn() {
    ic_cdk::println!("hello from test fn");
    ic_cdk::println!("hello from test fn");
    ic_cdk::println!("hello from test fn");
    ic_cdk::println!("hello from test fn");
    ic_cdk::println!("hello from test fn");
    ic_cdk::println!("hello from test fn");
    ic_cdk::println!("hello from test fn");
}