
SEARCH_STR="REACT_APP_CHILD_CANISTER_ID"
CHILD_ID=$(dfx canister id child)
sed -i "" "s/$SEARCH_STR/$CHILD_ID/g" "./build/child/static/js/bundle.js"
