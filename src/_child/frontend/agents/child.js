import { Actor } from '@dfinity/agent'
import { icHost, isLocal } from '../utils/url'
import { getAgent} from '../utils/agent'
import { MANAGEMENT_CANISTER_ID } from './management'

export const CHILD_CANISTER_ID =  process.env.REACT_APP_CHILD_CANISTER_ID ?? 'REACT_APP_CHILD_CANISTER_ID'

const idlChildFactory = ({ IDL }) => {
	const authentication = IDL.Variant({
		Ic: IDL.Null,
		Evm: IDL.Record({ address: IDL.Text }),
		Svm: IDL.Record({ address: IDL.Text }),
	});
	const authenticationWithAddress = IDL.Variant({
		Ic: IDL.Record({ principal: IDL.Principal}),
		Evm: IDL.Record({ address: IDL.Text }),
		Svm: IDL.Record({ address: IDL.Text }),
	});

	const ReplyResponse = IDL.Record({
		text: IDL.Text,
		timestamp: IDL.Nat64,
		authentication: authenticationWithAddress
	});

	const PostResponse = IDL.Record({
		title: IDL.Text,
		description: IDL.Text,
		timestamp: IDL.Nat64,
		replies: IDL.Vec(ReplyResponse),
    authentication: authenticationWithAddress,
	});

	const Profile = IDL.Record({
		name: IDL.Text,
		description: IDL.Text,
		authentication: authentication,
		active_principal: IDL.Principal
	});

	const PostSummary = IDL.Record({
		title: IDL.Text,
		post_id: IDL.Nat64,
		description: IDL.Text,
		authentication: authenticationWithAddress,
		timestamp: IDL.Nat64,
		replies_count: IDL.Nat64,
		last_activity: IDL.Nat64,
	});

	const authenticationWith = IDL.Variant({
		Evm: IDL.Record({ message: IDL.Text, signature: IDL.Text, }),
		Svm: IDL.Record({ public_key: IDL.Text, signature: IDL.Text, message: IDL.Text }),
		Ic: IDL.Null,
	});

	const Upgrade = IDL.Record({
		version: IDL.Text,
		upgrade_from: IDL.Opt(IDL.Vec(IDL.Nat8)),
		timestamp: IDL.Nat64,
	 	wasm_hash: IDL.Vec(IDL.Nat8), 
		assets: IDL.Vec(IDL.Text)
	})

	return IDL.Service({
		create_profile: IDL.Func([authenticationWith], [IDL.Variant({ Ok: Profile, Err: IDL.Text })], ["update"]),
		create_post: IDL.Func([IDL.Text, IDL.Text], [IDL.Variant({ Ok: PostSummary, Err: IDL.Text })], ["update"]),
		create_reply: IDL.Func([IDL.Nat64, IDL.Text], [IDL.Variant({ Ok: ReplyResponse, Err: IDL.Text })], ["update"]),
		get_profile: IDL.Func([], [IDL.Variant({ Ok: Profile, Err: IDL.Text })], ["query"]),
		get_post: IDL.Func([IDL.Nat64], [IDL.Variant({ Ok: PostResponse, Err: IDL.Text })], ["query"]),
		get_posts: IDL.Func([], [IDL.Vec(PostSummary)], ["query"]),
		get_posts_by_user: IDL.Func([authentication], [IDL.Variant({ Ok: IDL.Vec(PostSummary), Err: IDL.Text })], ["query"]),
		get_profile_by_user: IDL.Func([authentication], [IDL.Opt(Profile)], ["query"]),
		upgrade_canister: IDL.Func([IDL.Vec(IDL.Nat8)], [], ["update"]),
		get_next_upgrade: IDL.Func([],[IDL.Variant({ 'Ok': IDL.Opt(Upgrade), 'Err': IDL.Text })], ["query"])
	});
};
export const createChildActor = (identity) => Actor.createActor(idlChildFactory, {
  agent: getAgent(identity),
  canisterId: CHILD_CANISTER_ID,
  host: icHost,
  identity
})


export const createChildActorFromPlug = async () => {
	const isConnected = await window.ic.plug.isConnected()
	
	if(!isConnected) {
	const host = isLocal ? 'http://127.0.0.1:8000/' : 'https://mainnet.dfinity.network'
	const whitelist = [CHILD_CANISTER_ID, MANAGEMENT_CANISTER_ID]
	await window.ic.plug.requestConnect({whitelist, host});
	}
	
	const childActor = await window.ic.plug.createActor({
		canisterId: CHILD_CANISTER_ID,
		interfaceFactory: idlChildFactory,
	})

	return childActor
}