// import Ledger "canister:ledger";

import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Blob "mo:base/Blob";
import Int "mo:base/Int";
import Nat64 "mo:base/Nat64";
import Principal "mo:base/Principal";
import Time "mo:base/Time";

import Account "./Account";
import Types "./Types";

actor Self {

  let CMC : Types.CMC = actor("r7inp-6aaaa-aaaaa-aaabq-cai");
  let Ledger : Types.Ledger = actor("rrkah-fqaaa-aaaaa-aaaaq-cai");

  func getAccountId(principal: Principal) : Account.AccountIdentifier {
    Account.accountIdentifier(principal, Account.defaultSubaccount())
  };

  // TODO
  // send ICP to cmc account
    // -> dfx ledger balance --ledger-canister-id rrkah-fqaaa-aaaaa-aaaaq-cai
    // -> dfx ledger transfer --ledger-canister-id rrkah-fqaaa-aaaaa-aaaaq-cai --amount 1 --memo 1347768404 77d0c3bdfbd94494f337d1568919d8365ae55139744f63917fa9a1c6e3c6aa72
  // call cmc notify_top_up (height, canister_id) 
    // -> dfx canister call cmc notify_top_up 'record { block_index = 2; canister_id = principal "r7inp-6aaaa-aaaaa-aaabq-cai"}'
      // dfx canister call ledger query_blocks '(record {start = 1: nat64; length = 1:nat64})'
      // dfx canister status utils -> 3_899_619_683_425
      // https://github.com/dfinity/ic/blob/master/rs/nns/cmc/src/main.rs#L152
      // "Canister r7inp-6aaaa-aaaaa-aaabq-cai violated contract: ic0.mint_cycles cannot be executed on non Cycles Minting Canister: r7inp-6aaaa-aaaaa-aaabq-cai != rkp4c-7iaaa-aaaaa-aaaca-cai"
      // https://github.com/dfinity/ic/blob/85b4863a25995377006ac37f135c31ad3ad72d81/rs/cycles_account_manager/src/lib.rs#L709


  // (blob "w\d0\c3\bd\fb\d9D\94\f37\d1V\89\19\d86Z\e5Q9tOc\91\7f\a9\a1\c6\e3\c6\aar",)
  // 77d0c3bdfbd94494f337d1568919d8365ae55139744f63917fa9a1c6e3c6aa72
  // dfx ledger balance --ledger-canister-id rrkah-fqaaa-aaaaa-aaaaq-cai 77d0c3bdfbd94494f337d1568919d8365ae55139744f63917fa9a1c6e3c6aa72
  public query ({ caller }) func getCmcAccount() : async Blob {
    let canister_id = Principal.fromActor(Self);
    let cmc_canister_id = Principal.fromActor(CMC);
    let cmc_subaccount = Blob.fromArray(Account.principalToSubAccount(canister_id));
    let cmc_account = Account.accountIdentifier(cmc_canister_id, cmc_subaccount);
    return cmc_account;
  };

  // (blob "N\06\f1\9a\0c\b7(5\a9\04\1a\b3\ea\c6\ab\d4\19/<[\00\e0V\1c\22n\c7\a6\d0\a4\96R",)
  // 4e06f19a0cb72835a9041ab3eac6abd4192f3c5b00e0561c226ec7a6d0a49652
  // dfx ledger balance --ledger-canister-id rrkah-fqaaa-aaaaa-aaaaq-cai 4e06f19a0cb72835a9041ab3eac6abd4192f3c5b00e0561c226ec7a6d0a49652
  public query ({ caller }) func getDepositSubAccount() : async Blob {
    let canister_id = Principal.fromActor(Self);
    let caller_subaccount = Blob.fromArray(Account.principalToSubAccount(caller));
    let caller_account = Account.accountIdentifier(canister_id, caller_subaccount);
    return caller_account;
  };

};
