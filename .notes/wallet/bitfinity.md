
### Test out wallet

```js

await window.ic.infinityWallet.isConnected()
await window.ic.infinityWallet.requestConnect({ whitelist: ['rrkah-fqaaa-aaaaa-aaaaq-cai'] })

const interfaceFactory = ({ IDL }) => {

	const canisterState = IDL.Variant({ Preparing: IDL.Null, Creating: IDL.Null, Installing: IDL.Null, Uploading: IDL.Null, Authorizing: IDL.Null, Ready: IDL.Null })
	const canisterData = IDL.Record({ id: IDL.Opt(IDL.Principal), timestamp: IDL.Nat64, state: canisterState, })

	return IDL.Service({
		'get_user_canisters': IDL.Func([], [IDL.Vec(canisterData)], ['query']),
		'create_child': IDL.Func([], [IDL.Variant({ Ok: IDL.Principal, Err: IDL.Text })], []), // Result<Principal, String>
	})
}
const actor = await window.ic.infinityWallet.createActor({ canisterId: 'rrkah-fqaaa-aaaaa-aaaaq-cai', interfaceFactory, host: 'http://localhost:8000/' })

await actor.create_child()
await actor.get_user_canisters()

await window.ic.infinityWallet.disconnect()

```