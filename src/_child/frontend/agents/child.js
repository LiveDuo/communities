import { Actor } from '@dfinity/agent'
import { icHost, getAgent } from '.'

const idlChildFactory = ({ IDL }) => {
  const Post = IDL.Record({
    'id': IDL.Int,
    'title' : IDL.Text,
		'description' : IDL.Text,
    'principal_id': IDL.Text,
    'user_address': IDL.Text,
    'timestamp': IDL.Int,
  })
  const Profile = IDL.Record({
    'name': IDL.Text,
    'description': IDL.Text,
    'address': IDL.Text,
  })
  return IDL.Service({
    'get_posts': IDL.Func([IDL.Text, IDL.Int], [IDL.Vec(Post)], ['query']),
    'create_post': IDL.Func([IDL.Text, IDL.Text], [], []),
    'get_profile': IDL.Func([], [Profile], ['query']),
    'get_profile_by_address': IDL.Func([IDL.Text], [IDL.Opt(Profile)], ['query']),
    'update_profile_address': IDL.Func([IDL.Text, IDL.Text], [Profile], []),
    'update_profile': IDL.Func([IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)], [Profile], []),
  })
}

export const createChildActor = (identity) => Actor.createActor(idlChildFactory, {
  agent: getAgent(identity),
  canisterId: process.env.REACT_APP_CHILD_CANISTER_ID ?? 'REACT_APP_CHILD_CANISTER_ID',
  host: icHost,
  identity
})
