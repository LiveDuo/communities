import { Actor } from '@dfinity/agent'
import { icHost, getAgent } from '.'

if (!process.env.REACT_APP_BACKEND_CANISTER_ID) {
  throw new Error('Wall canister id environment variable is not set')
}

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
  canisterId: process.env.REACT_APP_BACKEND_CANISTER_ID,
  host: icHost,
  identity
})
