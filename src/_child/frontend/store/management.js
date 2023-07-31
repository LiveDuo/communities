import { useState, useContext, createContext, useCallback, useEffect } from 'react'

import {IdentityContext} from './identity'

export const MANAGEMENT_CANISTER_ID = "aaaaa-aa";

const idlFactory = ({ IDL }) => {
  const canisterId = IDL.Principal;
  const definiteCanisterSettings = IDL.Record({ freezing_threshold: IDL.Nat, controllers: IDL.Vec(IDL.Principal), memory_allocation: IDL.Nat, compute_allocation: IDL.Nat, });
  const canisterSettings = IDL.Record({ freezing_threshold: IDL.Opt(IDL.Nat), controllers: IDL.Opt(IDL.Vec(IDL.Principal)), memory_allocation: IDL.Opt(IDL.Nat), compute_allocation: IDL.Opt(IDL.Nat), });
  const wasmModule = IDL.Vec(IDL.Nat8);
  const status = IDL.Variant({ stopped: IDL.Null, stopping: IDL.Null, running: IDL.Null, })
  const canisterMode = IDL.Variant({ reinstall: IDL.Null, upgrade: IDL.Null, install: IDL.Null})
  return IDL.Service({
    canister_status: IDL.Func([IDL.Record({ canister_id: canisterId })],[IDL.Record({ status: status, memory_size: IDL.Nat, cycles: IDL.Nat, settings: definiteCanisterSettings, module_hash: IDL.Opt(IDL.Vec(IDL.Nat8)),}),],[]),
    create_canister: IDL.Func([IDL.Record({ settings: IDL.Opt(canisterSettings) })], [IDL.Record({ canister_id: canisterId })], []),
    delete_canister: IDL.Func([IDL.Record({ canister_id: canisterId })], [], []),
    deposit_cycles: IDL.Func( [IDL.Record({ canister_id: canisterId })], [], []),
    install_code: IDL.Func([IDL.Record({ arg: IDL.Vec(IDL.Nat8), wasm_module: wasmModule, mode: canisterMode, canister_id: canisterId }),],[],[]),
    provisional_create_canister_with_cycles: IDL.Func([IDL.Record({settings: IDL.Opt(canisterSettings),amount: IDL.Opt(IDL.Nat)}),],[IDL.Record({ canister_id: canisterId })],[]),
    provisional_top_up_canister: IDL.Func([IDL.Record({ canister_id: canisterId, amount: IDL.Nat })],[],[]),
    raw_rand: IDL.Func([], [IDL.Vec(IDL.Nat8)], []),
    start_canister: IDL.Func([IDL.Record({ canister_id: canisterId })], [], []),
    stop_canister: IDL.Func([IDL.Record({ canister_id: canisterId })], [], []),
    uninstall_code: IDL.Func([IDL.Record({ canister_id: canisterId })], [], []),
    update_settings: IDL.Func([IDL.Record({ canister_id: IDL.Principal, settings: canisterSettings, }),], [], []),
  });
};


const ManagementContext = createContext()

const ManagementProvider = ({ children }) => {

  const {identity, account, createActor} = useContext(IdentityContext)

	const [managementActor, setManagementActor] = useState()

  const loadActor = useCallback(async ()=>{
    let _actor
    if (!account) {
      _actor = await createActor({interfaceFactory: idlFactory, canisterId: MANAGEMENT_CANISTER_ID, identity: null})
    } else if (account.type ==='Evm' || account.type ==='Svm') {
      _actor = await createActor({interfaceFactory: idlFactory, canisterId: MANAGEMENT_CANISTER_ID, identity: identity})
    } else if (account.type === 'Ic') {
      _actor = await createActor({interfaceFactory: idlFactory, canisterId: MANAGEMENT_CANISTER_ID, type: 'ic'})
    }
    setManagementActor(_actor)
  },[account, identity, createActor])

  useEffect(() => {
    loadActor()
  },[loadActor])

	const value = {managementActor}
	return <ManagementContext.Provider value={value}>{children}</ManagementContext.Provider>
}

export { ManagementContext , ManagementProvider }
