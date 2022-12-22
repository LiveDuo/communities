
# prepare variables
canister_id=$(dfx canister id parent)
pem_file=~/.config/dfx/identity/default/identity.pem
if [[ $canister_id == "" ]]; then exit 1; fi

# upload parent frontend files
parent_frontend_folder="build/parent"
for file in $(find $parent_frontend_folder -not -path '*/.*'); do
    if [[ -d $file ]]; then continue; fi
    file_relative=${file/$parent_frontend_folder/""}
    icx_output=$(icx-asset --pem $pem_file upload $canister_id $file_relative=$file)
    if [[ $icx_output == "Starting batch." ]]; then exit 1; else echo $file_relative; fi
done
