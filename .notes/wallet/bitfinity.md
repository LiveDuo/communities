
### Test out wallet

```js

await window.ic.infinityWallet.isConnected()
await window.ic.infinityWallet.requestConnect({ whitelist: ['rrkah-fqaaa-aaaaa-aaaaq-cai'] })

const interfaceFactory = ({ IDL }) => {
  return IDL.Service({
    increment: IDL.Func([], [], ['update']),
    getValue: IDL.Func([], [IDL.Nat], ['query']),
  })
}

const actor = await window.ic.infinityWallet.createActor({ canisterId: 'rrkah-fqaaa-aaaaa-aaaaq-cai', interfaceFactory, host: "http://localhost:8000/" })

await actor.getValue()
await actor.increment()

await window.ic.infinityWallet.disconnect()

```