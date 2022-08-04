import { Actor } from '@dfinity/agent'
import { icUrl, getAgent } from '.'

const idlParentFactory = ({ IDL }) => {
  return IDL.Service({
    'caller_account_id': IDL.Func([], [IDL.Text], ['query']),
		'create_canister': IDL.Func([], [IDL.Variant({Ok: IDL.Principal, Err: IDL.Text})], []),
    'create_child_canister': IDL.Func([], [IDL.Variant({Ok: IDL.Principal, Err: IDL.Text})], []), // Result<Principal, String>
  })
}
export { idlParentFactory }

export const createParentActor = (identity) => Actor.createActor(idlParentFactory, {
  agent: getAgent(identity),
  canisterId: process.env.REACT_APP_PARENT_CANISTER_ID,
  host: icUrl,
  identity
})

export const parentCanisterId = process.env.REACT_APP_PARENT_CANISTER_ID