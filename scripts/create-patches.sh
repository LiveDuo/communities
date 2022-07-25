
# download original to temp
tmp_file=$(mktemp)
tmp_file_2=$(mktemp)
curl --silent -o $tmp_file https://raw.githubusercontent.com/dfinity/cdk-rs/main/src/ic-certified-assets/src/lib.rs
curl --silent -o $tmp_file_2 https://raw.githubusercontent.com/dfinity/cdk-rs/main/src/ic-certified-assets/src/state_machine.rs

# create patch
source_file=~/.cargo/registry/src/github.com-1ecc6299db9ec823/ic-certified-assets-0.2.4/src/lib.rs
source_file_2=~/.cargo/registry/src/github.com-1ecc6299db9ec823/ic-certified-assets-0.2.4/src/state_machine.rs
diff -Naur $source_file $tmp_file > ./patches/ic-certified-assets-lib.patch
diff -Naur $source_file_2 $tmp_file_2 > ./patches/ic-certified-assets-state.patch

# delete temp file
rm -rf $tmp_file
rm -rf $tmp_file_2
