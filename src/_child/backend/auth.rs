use candid::Principal;
use crate::state::{Authentication, AuthenticationWithAddress, IcParams};

pub fn get_authentication_with_address(authentication: &Authentication, caller: &Principal) -> AuthenticationWithAddress {
  match authentication {
      Authentication::Evm(params) => AuthenticationWithAddress::Evm(params.to_owned()),
      Authentication::Svm(params) => AuthenticationWithAddress::Svm(params.to_owned()),
      Authentication::Ic => {
          let params = IcParams {principal: caller.to_owned()};
          AuthenticationWithAddress::Ic(params)
      },
  }
}

fn login_message(principal: &Principal) -> String {
  format!("Sign this message to login.\n\nApp:\ncommunities.ooo\n\nAddress:\n{}\n\n", principal.to_string())
}

pub fn login_message_hex_evm(principal: &Principal) -> String {
  let message_prefix = format!("\x19Ethereum Signed Message:\n");
  let message_prefix_encode = hex::encode(&message_prefix);
  let message_prefix_msg =  hex::decode(message_prefix_encode).unwrap();

  let str = login_message(&principal);
  let str_encode = hex::encode(&str);
  let hex_msg =  hex::decode(str_encode).unwrap();

  let msg_length = format!("{}", hex_msg.len());
  let msg_length_encode = hex::encode(&msg_length);
  let msg_length_hex =  hex::decode(msg_length_encode).unwrap();

  let msg_vec = [message_prefix_msg, msg_length_hex, hex_msg].concat();

  easy_hasher::easy_hasher::raw_keccak256(msg_vec).to_hex_string()

}

pub fn login_message_hex_svm(principal: &Principal) -> String {
  let msg = login_message(&principal);
  hex::encode(&msg)
}