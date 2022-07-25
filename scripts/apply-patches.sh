
# apply patches
source_file=~/.cargo/registry/src/github.com-1ecc6299db9ec823/ic-certified-assets-0.2.4/src/lib.rs
source_file_2=~/.cargo/registry/src/github.com-1ecc6299db9ec823/ic-certified-assets-0.2.4/src/state_machine.rs

patch_file=./patches/ic-certified-assets-lib.patch
patch_file_2=./patches/ic-certified-assets-state.patch

patch -N -i $patch_file -u $source_file
patch -N -i $patch_file_2 -u $source_file_2
