import { Actor } from '@dfinity/agent'
import { icHost, getAgent } from '.'

const idlProfileFactory = ({ IDL }) => {
  const Profile = IDL.Record({
    'name': IDL.Text,
    'description': IDL.Text,
    'address': IDL.Text,
  })
  return IDL.Service({
    'get_profile': IDL.Func([], [Profile], ['query']),
    'get_profile_by_address': IDL.Func([IDL.Text], [IDL.Opt(Profile)], ['query']),
    'update_profile_address': IDL.Func([IDL.Text, IDL.Text], [Profile], []),
    'update_profile': IDL.Func([IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)], [Profile], []),
  })
}

export const createProfileActor = (identity) => Actor.createActor(idlProfileFactory, {
  agent: getAgent(identity),
  canisterId: process.env.REACT_APP_CHILD_CANISTER_ID ?? 'REACT_APP_CHILD_CANISTER_ID',
  host: icHost,
  identity
})
