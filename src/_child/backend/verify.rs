
use ed25519_dalek::{VerifyingKey, Signature, Verifier};
use crate::state::*;

fn checksum_evm_address (address: String) -> String {
    let hash =  easy_hasher::easy_hasher::keccak256(&address.trim_start_matches("0x").to_lowercase());
    let hash_hex = hash.to_hex_string();

    let mut ret :Vec<String> = vec![];

    for (i, c) in address.trim_start_matches("0x").chars().enumerate() {
        let car = &c.to_string();
        if hash_hex.chars().nth(i).unwrap().to_digit(16).unwrap() >= 8 {
            ret.push(car.to_uppercase());
        } else {
            ret.push(car.to_owned());
        }
    }

    "0x".to_owned() + &ret.join("")
}

pub fn verify_svm(args: SvmAuthenticationWithParams) -> SvmParams {
    let public_key = hex::decode(&args.public_key).unwrap();

    let signature = hex::decode(&args.signature).unwrap();
    let msg = hex::decode(&args.message).unwrap();

    let public_key = VerifyingKey::from_bytes(&public_key.try_into().unwrap()).unwrap();
    let sig = Signature::from_bytes(&signature.try_into().unwrap());
    public_key.verify(&msg, &sig).unwrap();

    let address = bs58::encode(public_key).into_string();
    SvmParams { address: address }
}

pub fn verify_evm(args: EvmAuthenticationWithParams) -> EvmParams {
    let mut signature_bytes = hex::decode(&args.signature.trim_start_matches("0x")).unwrap();
    let recovery_byte = signature_bytes.pop().expect("No recovery byte");
    let recovery_id = libsecp256k1::RecoveryId::parse_rpc(recovery_byte).unwrap();
    let signature_slice = signature_bytes.as_slice();
    let signature_bytes: [u8; 64] = signature_slice.try_into().unwrap();
    let signature = libsecp256k1::Signature::parse_standard(&signature_bytes).unwrap();
    let message_bytes = hex::decode(&args.message.trim_start_matches("0x")).unwrap();
    let message_bytes: [u8; 32] = message_bytes.try_into().unwrap();
    let message = libsecp256k1::Message::parse(&message_bytes);
    let public_key = libsecp256k1::recover(&message, &signature, &recovery_id).unwrap();
    let public_key_bytes = public_key.serialize();
    let keccak256 = easy_hasher::easy_hasher::raw_keccak256(public_key_bytes[1..].to_vec());
    let keccak256_hex = keccak256.to_hex_string();
    let address: String = checksum_evm_address("0x".to_owned() + &keccak256_hex[24..]);

    EvmParams { address }
}
