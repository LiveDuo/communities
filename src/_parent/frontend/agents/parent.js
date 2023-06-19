import { Actor } from '@dfinity/agent'
import { icUrl, getAgent } from '.'

const idlParentFactory = ({ IDL }) => {

  const canisterData = IDL.Record({
    id: IDL.Opt(IDL.Principal),
    timestamp: IDL.Nat64,
    state: IDL.Variant({Preparing: IDL.Null, Creating: IDL.Null, Installing: IDL.Null, Uploading: IDL.Null, Ready: IDL.Null}),
  })

  return IDL.Service({
    'get_user_canisters': IDL.Func([], [IDL.Vec(canisterData)], ['query']),
    'create_child': IDL.Func([], [IDL.Variant({Ok: IDL.Principal, Err: IDL.Text})], []), // Result<Principal, String>
  })
}
export { idlParentFactory }

export const parentCanisterId = process.env.REACT_APP_PARENT_CANISTER_ID

export const createParentActor = (identity) => Actor.createActor(idlParentFactory, {
  agent: getAgent(identity),
  canisterId: parentCanisterId,
  host: icUrl,
  identity
})

const createParentActorPlug = async () => {
	const actor = await window.ic?.plug.createActor({ canisterId: parentCanisterId, interfaceFactory: idlParentFactory })
	return actor
}
export { createParentActorPlug }
