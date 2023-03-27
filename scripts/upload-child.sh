
# prepare variables
canister_id=$(dfx canister id parent)
pem_file=~/.config/dfx/identity/default/identity.pem
if [[ $canister_id == "" ]]; then exit 1; fi

# upload child frontend files
child_assets=""
child_frontend_folder="build/child"
for file in $(find $child_frontend_folder -not -path '*/.*'); do
    if [[ -d $file ]]; then continue; fi
    file_relative="/child${file/$child_frontend_folder/}"
    icx_output=$(icx-asset --pem $pem_file upload $canister_id $file_relative=$file)
    if [[ $icx_output == "Starting batch." ]]; then exit 1; else echo $file_relative; fi
    child_assets+="\"${file/$child_frontend_folder/}\", "
done

# upload child assets list
child_assets_list="[${child_assets::${#child_assets}-2}]"
tmp_file=$(mktemp)
echo $child_assets_list > $tmp_file
icx_output=$(icx-asset --pem $pem_file upload $canister_id /child/frontend.assets=$tmp_file)
if [[ $icx_output == "Starting batch." ]]; then exit 1; else echo "/child/frontend.assets"; fi
rm -rf $tmp_file

# upload child wasm file
icx_output=$(icx-asset --pem $pem_file upload $canister_id /child/child.wasm=./build/canister/child.wasm)
if [[ $icx_output == "Starting batch." ]]; then exit 1; else echo "/child/child.wasm"; fi

