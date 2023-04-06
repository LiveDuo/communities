
# prepare variables
canister_id=$(dfx canister id child)
pem_file=~/.config/dfx/identity/default/identity.pem
if [[ $canister_id == "" ]]; then exit 1; fi

# upload child frontend files
child_frontend_folder="build/child"
for file in $(find $child_frontend_folder -not -path '*/.*'); do
    if [[ -d $file ]]; then continue; fi
    file_relative=${file/$child_frontend_folder/""}
    icx_output=$(icx-asset --pem $pem_file upload $canister_id $file_relative=$file)
    if [[ $icx_output == "Starting batch." ]]; then exit 1; else echo $file_relative; fi
done
