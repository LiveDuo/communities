import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Nat8 "mo:base/Nat8";

actor Canister {
  
  public query func getManagementCanisterId() : async Principal {
    return Principal.fromBlob(Blob.fromArray([]));
  };

  public query func getCanisterId(i: Nat) : async Principal {
    let arr: [Nat8] = [0, 0, 0, 0, 0, 0, 0, Nat8.fromNat(i), 1, 1];
    return Principal.fromBlob(Blob.fromArray(arr));
  };

};
