import { Actor } from '@dfinity/agent'
import { icHost, getAgent } from '.'

const idlWallFactory = ({ IDL }) => {
  const Post = IDL.Record({
    'id': IDL.Int,
    'text': IDL.Text,
    'principal_id': IDL.Text,
    'user_address': IDL.Text,
    'user_name': IDL.Text,
    'timestamp': IDL.Int,
  })
  return IDL.Service({
    'wall': IDL.Func([IDL.Text, IDL.Int], [IDL.Vec(Post)], ['query']),
    'write': IDL.Func([IDL.Text], [], []),
  })
}

export const createWallActor = (identity) => Actor.createActor(idlWallFactory, {
  agent: getAgent(identity),
  canisterId: 'REACT_APP_PARENT_CANISTER_ID',
  host: icHost,
  identity
})
