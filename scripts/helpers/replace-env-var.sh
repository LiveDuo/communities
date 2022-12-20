
SEARCH_STR="REACT_APP_PARENT_CANISTER_ID"
PARENT_ID="rrkah-fqaaa-aaaaa-aaaaq-cai"
sed -i "" "s/$SEARCH_STR/$PARENT_ID/g" "./build/child/static/js/bundle.js"
