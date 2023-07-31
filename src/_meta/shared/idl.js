const childFactory = ({ IDL }) => {
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
		upgrade_canister: IDL.Func([IDL.Vec(IDL.Nat8), IDL.Text], [], ["update"]),
		get_next_upgrades: IDL.Func([],[IDL.Variant({ 'Ok': IDL.Vec(Upgrade), 'Err': IDL.Text })], ["query"])
	});
};
exports.childFactory = childFactory

const parentFactory = ({ IDL }) => {
	const Upgrade = IDL.Record({'version': IDL.Text, "upgrade_from": IDL.Opt(IDL.Vec(IDL.Nat8)), 'timestamp': IDL.Nat64, 'wasm_hash': IDL.Vec(IDL.Nat8), 'assets': IDL.Vec(IDL.Text)})
	const UpgradeResponse = IDL.Record({'version': IDL.Text, "upgrade_from": IDL.Opt(IDL.Vec(IDL.Nat8)), 'timestamp': IDL.Nat64, 'wasm_hash': IDL.Vec(IDL.Nat8), 'assets': IDL.Vec(IDL.Text), 'track': IDL.Text})

	return IDL.Service({
		'create_child': IDL.Func([], [IDL.Variant({ 'Ok': IDL.Principal, 'Err': IDL.Text })], []),
		'create_upgrade':  IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Text), IDL.Text], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
		'get_next_upgrade':  IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Opt(Upgrade)], []),
		'get_upgrades':  IDL.Func([], [IDL.Vec(UpgradeResponse)], []),
		'remove_upgrade':  IDL.Func([IDL.Text, IDL.Text], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
	})
}
exports.parentFactory = parentFactory

const assetFactory = ({ IDL }) => {
	const StoreArgs = IDL.Record({'key': IDL.Text, 'content_type': IDL.Text, 'content_encoding': IDL.Text, 'content': IDL.Vec(IDL.Nat8)})
	return IDL.Service({
		'create_batch': IDL.Func([IDL.Text], [], []),
		'append_chunk': IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [], []),
		'commit_batch': IDL.Func([IDL.Text], [], []),
		'store_batch': IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [], []),
		'store': IDL.Func([StoreArgs], [], []),
	})
}
exports.assetFactory = assetFactory
