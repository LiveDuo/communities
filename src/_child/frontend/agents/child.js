import { Actor } from '@dfinity/agent'
import { icHost, getAgent } from '.'

const idlChildFactory = ({ IDL }) => {
  const Reply = IDL.Record({
    'text': IDL.Text,
    'timestamp': IDL.Nat64,
    'address': IDL.Text
  })
  const Post = IDL.Record({
    'title' : IDL.Text,
		'description' : IDL.Text,
    'address': IDL.Text,
    'timestamp': IDL.Nat64,
    'replies': IDL.Vec(Reply),
  })
  const PostSummary = IDL.Record({
    'title' : IDL.Text,
		'description' : IDL.Text,
    'address': IDL.Text,
    'timestamp': IDL.Nat64,
    'replies_count': IDL.Nat64,
    'last_activity': IDL.Nat64,
  })
  const Profile = IDL.Record({
    'name': IDL.Text,
    'description': IDL.Text,
    'address': IDL.Text,
  })
  return IDL.Service({
    'get_post': IDL.Func([IDL.Nat64], [Post], ['query']),
    'get_posts': IDL.Func([], [IDL.Vec(PostSummary)], ['query']),
    'create_post': IDL.Func([IDL.Text, IDL.Text], [], []),
    'create_reply': IDL.Func([IDL.Nat64, IDL.Text], [], ['update']),
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
