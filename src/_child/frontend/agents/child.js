import { Actor } from '@dfinity/agent'
import { icHost, getAgent } from '.'

const idlChildFactory = ({ IDL }) => {
  const Reply = IDL.Record({
    text: IDL.Text,
    timestamp: IDL.Nat64,
    address: IDL.Text,
  })

  const Post = IDL.Record({
    title: IDL.Text,
    description: IDL.Text,
    timestamp: IDL.Nat64
  })

  const PostResult = IDL.Record({
    title: IDL.Text,
    description: IDL.Text,
    timestamp: IDL.Nat64,
    address: IDL.Text,
    replies: IDL.Vec(Reply),
  })

  const authentication = IDL.Variant({
    Ic: IDL.Record({ principal: IDL.Principal }),
    Evm: IDL.Record({ address: IDL.Text }),
    Svm: IDL.Record({ address: IDL.Text }),
  })

  
  const Profile = IDL.Record({
    name: IDL.Text,
    description: IDL.Text,
    authentication: authentication,
  })

  const PostSummary = IDL.Record({
    title: IDL.Text,
    description: IDL.Text,
    address: IDL.Text,
    timestamp: IDL.Nat64,
    replies_count: IDL.Nat64,
    last_activity: IDL.Nat64,
    post_id: IDL.Nat64
  })

  const authenticationWith = IDL.Variant({
    Evm: IDL.Record({ message: IDL.Text, signature:  IDL.Text,}),
    Svm: IDL.Record({ public_key: IDL.Text, signature: IDL.Text, message: IDL.Text }),
    Ic: IDL.Null,
  })

  return IDL.Service({
    create_profile: IDL.Func([authenticationWith],[IDL.Variant({ Ok: Profile, Err: IDL.Text })],["update"]),
    create_post: IDL.Func([IDL.Text, IDL.Text],[IDL.Variant({ Ok: Post, Err: IDL.Text })],["update"]),
    create_reply: IDL.Func([IDL.Nat64, IDL.Text],[IDL.Variant({ Ok: Reply, Err: IDL.Text })],["update"]),
    get_profile: IDL.Func([],[IDL.Variant({ Ok: Profile, Err: IDL.Text })],["query"]),
    get_post: IDL.Func([IDL.Nat64],[IDL.Variant({ Ok: PostResult, Err: IDL.Text })],["query"]),
    get_posts: IDL.Func([], [IDL.Vec(PostSummary)], ["query"]),
    get_posts_by_user: IDL.Func([authentication], [IDL.Variant({ Ok: IDL.Vec(Post), Err: IDL.Text })], ["query"]),
  })
}

export const createChildActor = (identity) => Actor.createActor(idlChildFactory, {
  agent: getAgent(identity),
  canisterId: process.env.REACT_APP_CHILD_CANISTER_ID ?? 'REACT_APP_CHILD_CANISTER_ID',
  host: icHost,
  identity
})
