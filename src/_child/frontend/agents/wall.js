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
    'get_posts': IDL.Func([IDL.Text, IDL.Int], [IDL.Vec(Post)], ['query']),
    'create_post': IDL.Func([IDL.Text], [], []),
  })
}

export const createWallActor = (identity) => Actor.createActor(idlWallFactory, {
  agent: getAgent(identity),
  canisterId: process.env.REACT_APP_CHILD_CANISTER_ID ?? 'REACT_APP_CHILD_CANISTER_ID',
  host: icHost,
  identity
})
