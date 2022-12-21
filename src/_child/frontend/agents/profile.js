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
    'get_principal_by_eth': IDL.Func(
      [IDL.Text],
      [IDL.Opt(IDL.Principal)],
      ['query'],
    ),
    'get_profile_by_eth': IDL.Func([IDL.Text], [IDL.Opt(Profile)], ['query']),
    'get_profile_by_principal': IDL.Func(
      [IDL.Principal],
      [IDL.Opt(Profile)],
      ['query'],
    ),
    'link_address': IDL.Func([IDL.Text, IDL.Text], [Profile], []),
    'set_description': IDL.Func([IDL.Text], [Profile], []),
    'set_name': IDL.Func([IDL.Text], [Profile], []),
  })
}

export const createProfileActor = (identity) => Actor.createActor(idlProfileFactory, {
  agent: getAgent(identity),
  canisterId: process.env.REACT_APP_CHILD_CANISTER_ID ?? 'REACT_APP_CHILD_CANISTER_ID',
  host: icHost,
  identity
})
