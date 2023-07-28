
### Test out wallet

```js

await window.ic.plug.isConnected()
await window.ic.plug.requestConnect({ whitelist: ['rrkah-fqaaa-aaaaa-aaaaq-cai'], host: 'http://localhost:8000/' })

const interfaceFactory = ({ IDL }) => {

	const canisterState = IDL.Variant({ Preparing: IDL.Null, Creating: IDL.Null, Installing: IDL.Null, Uploading: IDL.Null, Authorizing: IDL.Null, Ready: IDL.Null })
	const canisterData = IDL.Record({ id: IDL.Opt(IDL.Principal), timestamp: IDL.Nat64, state: canisterState, })

	return IDL.Service({
		'get_user_canisters': IDL.Func([], [IDL.Vec(canisterData)], ['query']),
		'create_child': IDL.Func([], [IDL.Variant({ Ok: IDL.Principal, Err: IDL.Text })], []),
	})
}
const actor = await window.ic.plug.createActor({ canisterId: 'rrkah-fqaaa-aaaaa-aaaaq-cai', interfaceFactory })

await actor.create_child()
await actor.get_user_canisters()

await window.ic.plug.disconnect()

```