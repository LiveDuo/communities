
SEARCH_STR="REACT_APP_BACKEND_CANISTER_ID"
BACKEND_ID="rrkah-fqaaa-aaaaa-aaaaq-cai"
sed -i "" "s/$SEARCH_STR/$BACKEND_ID/g" "./build/child/static/js/bundle.js"
