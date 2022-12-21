
SEARCH_STR="REACT_APP_CHILD_CANISTER_ID"
CHILD_ID="rrkah-fqaaa-aaaaa-aaaaq-cai"
sed -i "" "s/$SEARCH_STR/$CHILD_ID/g" "./build/child/static/js/bundle.js"
