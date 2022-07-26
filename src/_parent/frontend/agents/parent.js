import { Actor } from '@dfinity/agent'
import { icHost, getAgent } from '.'

const idlParentFactory = ({ IDL }) => {
  return IDL.Service({
    'create_child_canister': IDL.Func([], [IDL.Variant({Ok: IDL.Principal, Err: IDL.Text})], []), // Result<Principal, String>
  })
}

export const createParentActor = (identity) => Actor.createActor(idlParentFactory, {
  agent: getAgent(identity),
  canisterId: process.env.REACT_APP_PARENT_CANISTER_ID,
  host: icHost,
  identity
})
