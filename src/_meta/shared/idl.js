const childFactory = ({ IDL }) => {
	const Authentication = IDL.Variant({
		Ic: IDL.Null,
		Evm: IDL.Record({ address: IDL.Text }),
		Svm: IDL.Record({ address: IDL.Text }),
	});
	const AuthenticationWithAddress = IDL.Variant({
		Ic: IDL.Record({ principal: IDL.Principal }),
		Evm: IDL.Record({ address: IDL.Text }),
		Svm: IDL.Record({ address: IDL.Text }),
	});

	const ReplyStatus = IDL.Variant({
		Visible: IDL.Null,
		Hidden: IDL.Null
	})

	const PostStatus = IDL.Variant({
		Visible: IDL.Null,
		Hidden: IDL.Null
	})

	const ReplyResponse = IDL.Record({
		text: IDL.Text,
		timestamp: IDL.Nat64,
		authentication: AuthenticationWithAddress,
		likes: IDL.Vec(IDL.Tuple(IDL.Nat64, AuthenticationWithAddress)),
		reply_id: IDL.Nat64,
		status: ReplyStatus
	});

	const PostResponse = IDL.Record({
		title: IDL.Text,
		description: IDL.Text,
		timestamp: IDL.Nat64,
		replies: IDL.Vec(ReplyResponse),
		likes: IDL.Vec(IDL.Tuple(IDL.Nat64, AuthenticationWithAddress)),
		status: PostStatus,
		post_id: IDL.Nat64
	});

	const Profile = IDL.Record({
		name: IDL.Text,
		description: IDL.Text,
		authentication: Authentication,
		active_principal: IDL.Principal
	});

	const PostSummary = IDL.Record({
		title: IDL.Text,
		post_id: IDL.Nat64,
		description: IDL.Text,
		authentication: AuthenticationWithAddress,
		timestamp: IDL.Nat64,
		replies_count: IDL.Nat64,
		last_activity: IDL.Nat64,
	});

	const authenticationWith = IDL.Variant({
		Evm: IDL.Record({ message: IDL.Text, signature: IDL.Text, }),
		Svm: IDL.Record({ public_key: IDL.Text, signature: IDL.Text, message: IDL.Text }),
		Ic: IDL.Null,
	});

	const UpgradeFrom = IDL.Record({ 'version': IDL.Text, 'track': IDL.Text })
	const Track = IDL.Record({ 'name': IDL.Text, 'timestamp': IDL.Nat64 })
	const UpgradeWithTrack = IDL.Record({
		version: IDL.Text,
		upgrade_from: IDL.Opt(UpgradeFrom),
		timestamp: IDL.Nat64,
		assets: IDL.Vec(IDL.Text),
		track: Track,
		description: IDL.Text
	})
	const Metadata = IDL.Record({version: IDL.Text, track: IDL.Text})

	return IDL.Service({
		create_profile: IDL.Func([authenticationWith], [IDL.Variant({ Ok: Profile, Err: IDL.Text })], ["update"]),
		create_post: IDL.Func([IDL.Text, IDL.Text], [IDL.Variant({ Ok: PostSummary, Err: IDL.Text })], ["update"]),
		create_reply: IDL.Func([IDL.Nat64, IDL.Text], [IDL.Variant({ Ok: ReplyResponse, Err: IDL.Text })], ["update"]),
		update_post_status: IDL.Func([IDL.Nat64, PostStatus], [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })], ["update"]),
		update_reply_status: IDL.Func([IDL.Nat64, ReplyStatus], [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })], ["update"]),
		like_post: IDL.Func([IDL.Nat64], [IDL.Variant({ Ok: IDL.Nat64, Err: IDL.Text })], ["update"]),
		unlike_post: IDL.Func([IDL.Nat64], [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })], ["update"]),
		like_reply: IDL.Func([IDL.Nat64], [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })], ["update"]),
		unlike_reply: IDL.Func([IDL.Nat64], [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })], ["update"]),
		get_profile: IDL.Func([], [IDL.Variant({ Ok: Profile, Err: IDL.Text })], ["query"]),
		get_post: IDL.Func([IDL.Nat64], [IDL.Variant({ Ok: PostResponse, Err: IDL.Text })], ["query"]),
		get_posts: IDL.Func([], [IDL.Vec(PostSummary)], ["query"]),
		get_posts_by_auth: IDL.Func([AuthenticationWithAddress], [IDL.Variant({ Ok: IDL.Vec(PostSummary), Err: IDL.Text })], ["query"]),
		get_hidden_posts: IDL.Func([], [IDL.Variant({ Ok: IDL.Vec(PostResponse), Err: IDL.Text })], ["query"]),
		get_hidden_replies: IDL.Func([], [IDL.Variant({ Ok: IDL.Vec(IDL.Tuple(IDL.Nat64, ReplyResponse)), Err: IDL.Text })], ["query"]),
		get_metadata: IDL.Func([],[IDL.Variant({ 'Ok': Metadata, 'Err': IDL.Text })], ["query"]),
		upgrade_canister: IDL.Func([IDL.Text, IDL.Text], [], ["update"]),
		get_next_upgrades: IDL.Func([], [IDL.Variant({ 'Ok': IDL.Vec(UpgradeWithTrack), 'Err': IDL.Text })], ["update"])
	});
};
exports.childFactory = childFactory

const parentFactory = ({ IDL }) => {
	const UpgradeFrom = IDL.Record({ 'version': IDL.Text, 'track': IDL.Text })
	const track = IDL.Record({ 'name': IDL.Text, 'timestamp': IDL.Nat64 })
	const UpgradeWithTrack = IDL.Record({ 'version': IDL.Text, "upgrade_from": IDL.Opt(UpgradeFrom), 'timestamp': IDL.Nat64, 'assets': IDL.Vec(IDL.Text), 'track': track, 'description': IDL.Text })

	return IDL.Service({
		'create_child': IDL.Func([], [IDL.Variant({ 'Ok': IDL.Principal, 'Err': IDL.Text })], []),
		'create_upgrade': IDL.Func([IDL.Text, IDL.Opt(UpgradeFrom), IDL.Vec(IDL.Text), IDL.Text, IDL.Text], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
		'create_track': IDL.Func([IDL.Text], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
		'get_next_upgrade': IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(UpgradeWithTrack)], []),
		'get_upgrades': IDL.Func([], [IDL.Vec(UpgradeWithTrack)], []),
		'remove_upgrade': IDL.Func([IDL.Text, IDL.Text], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
		'remove_track': IDL.Func([IDL.Text], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
	})
}
exports.parentFactory = parentFactory

const assetFactory = ({ IDL }) => {
	const StoreArgs = IDL.Record({ 'key': IDL.Text, 'content_type': IDL.Text, 'content_encoding': IDL.Text, 'content': IDL.Vec(IDL.Nat8) })
	const ClearArguments = IDL.Record({});
	const Key = IDL.Text;
	const HeaderField = IDL.Tuple(IDL.Text, IDL.Text);
	const CreateAssetArguments = IDL.Record({ 'key' : Key, 'content_type' : IDL.Text, 'headers' : IDL.Opt(IDL.Vec(HeaderField)), 'max_age' : IDL.Opt(IDL.Nat64), });
	const StoreArg = IDL.Record({ 'key' : Key, 'content' : IDL.Vec(IDL.Nat8), 'sha256' : IDL.Opt(IDL.Vec(IDL.Nat8)), 'content_type' : IDL.Text, 'content_encoding' : IDL.Text, });
	const UnsetAssetContentArguments = IDL.Record({ 'key' : Key, 'content_encoding' : IDL.Text, });
	const DeleteAssetArguments = IDL.Record({ 'key' : Key });
	const ChunkId = IDL.Nat;
	const SetAssetContentArguments = IDL.Record({'key' : Key, 'sha256' : IDL.Opt(IDL.Vec(IDL.Nat8)), 'chunk_ids' : IDL.Vec(ChunkId), 'content_encoding' : IDL.Text, });
	const BatchOperationKind = IDL.Variant({ 'CreateAsset' : CreateAssetArguments, 'StoreAsset' : StoreArg, 'UnsetAssetContent' : UnsetAssetContentArguments, 'DeleteAsset' : DeleteAssetArguments, 'SetAssetContent' : SetAssetContentArguments, 'Clear' : ClearArguments, });
	return IDL.Service({
		'execute_batch': IDL.Func([IDL.Vec(BatchOperationKind)], [], []),
		'store': IDL.Func([StoreArgs], [], []),
		'list' : IDL.Func([],[IDL.Vec( IDL.Record({'key' : Key, 'encodings' : IDL.Vec( IDL.Record({ 'modified' : IDL.Int, 'sha256' : IDL.Opt(IDL.Vec(IDL.Nat8)), 'length' : IDL.Nat, 'content_encoding' : IDL.Text, }) ), 'content_type' : IDL.Text, }) ),], ['query'], ),
	})
}
exports.assetFactory = assetFactory

const managementFactory = ({ IDL }) => {
	const canisterId = IDL.Principal;
	const definiteCanisterSettings = IDL.Record({ freezing_threshold: IDL.Nat, controllers: IDL.Vec(IDL.Principal), memory_allocation: IDL.Nat, compute_allocation: IDL.Nat, });
	const canisterSettings = IDL.Record({ freezing_threshold: IDL.Opt(IDL.Nat), controllers: IDL.Opt(IDL.Vec(IDL.Principal)), memory_allocation: IDL.Opt(IDL.Nat), compute_allocation: IDL.Opt(IDL.Nat), });
	const wasmModule = IDL.Vec(IDL.Nat8);
	const status = IDL.Variant({ stopped: IDL.Null, stopping: IDL.Null, running: IDL.Null, })
	const canisterMode = IDL.Variant({ reinstall: IDL.Null, upgrade: IDL.Null, install: IDL.Null })

	const fromCanister = IDL.Record({ canister_version: IDL.Opt(IDL.Nat64), canister_id: IDL.Principal, })
	const changeOrigin = IDL.Variant({ from_user: IDL.Record({ user_id: IDL.Principal }), from_canister: fromCanister, })
	const mode = IDL.Variant({ reinstall: IDL.Null, upgrade: IDL.Null, install: IDL.Null, })
	const changeDetails = IDL.Variant({
		creation: IDL.Record({ controllers: IDL.Vec(IDL.Principal) }),
		code_deployment: IDL.Record({ mode: mode, module_hash: IDL.Vec(IDL.Nat8), }),
		controllers_change: IDL.Record({ controllers: IDL.Vec(IDL.Principal) }),
		code_uninstall: IDL.Null,
	})
	const change = IDL.Record({ timestamp_nanos: IDL.Nat64, canister_version: IDL.Nat64, origin: changeOrigin, details: changeDetails })
	const canisterInfoResponse = IDL.Record({ controllers: IDL.Vec(IDL.Principal), module_hash: IDL.Opt(IDL.Vec(IDL.Nat8)), recent_changes: IDL.Vec(change), total_num_changes: IDL.Nat64 })

	return IDL.Service({
		canister_status: IDL.Func([IDL.Record({ canister_id: canisterId })], [IDL.Record({ status: status, memory_size: IDL.Nat, cycles: IDL.Nat, settings: definiteCanisterSettings, module_hash: IDL.Opt(IDL.Vec(IDL.Nat8)), }),], []),
		canister_info: IDL.Func([IDL.Record({ canister_id: canisterId, num_requested_changes: IDL.Opt(IDL.Nat64) })], [canisterInfoResponse], []),
		create_canister: IDL.Func([IDL.Record({ settings: IDL.Opt(canisterSettings) })], [IDL.Record({ canister_id: canisterId })], []),
		delete_canister: IDL.Func([IDL.Record({ canister_id: canisterId })], [], []),
		deposit_cycles: IDL.Func([IDL.Record({ canister_id: canisterId })], [], []),
		install_code: IDL.Func([IDL.Record({ arg: IDL.Vec(IDL.Nat8), wasm_module: wasmModule, mode: canisterMode, canister_id: canisterId }),], [], []),
		provisional_create_canister_with_cycles: IDL.Func([IDL.Record({ settings: IDL.Opt(canisterSettings), amount: IDL.Opt(IDL.Nat) }),], [IDL.Record({ canister_id: canisterId })], []),
		provisional_top_up_canister: IDL.Func([IDL.Record({ canister_id: canisterId, amount: IDL.Nat })], [], []),
		raw_rand: IDL.Func([], [IDL.Vec(IDL.Nat8)], []),
		start_canister: IDL.Func([IDL.Record({ canister_id: canisterId })], [], []),
		stop_canister: IDL.Func([IDL.Record({ canister_id: canisterId })], [], []),
		uninstall_code: IDL.Func([IDL.Record({ canister_id: canisterId })], [], []),
		update_settings: IDL.Func([IDL.Record({ canister_id: IDL.Principal, settings: canisterSettings, }),], [], []),
	})
}
exports.managementFactory = managementFactory
