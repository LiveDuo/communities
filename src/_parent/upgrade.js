const fs = require('fs/promises')
const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')

const { getCanisters, getAgent, hostType } = require('../_meta/shared/utils')
const { getIdentity } = require('../_meta/shared/identity')

const argv = minimist(process.argv.slice(2))
const host = argv.network ?? 'http://127.0.0.1:8000'
const id = argv.identity ?? 'default'


const childInterface = ({ IDL }) => {
	return IDL.Service({
		upgrade: IDL.Func([IDL.Vec(IDL.Nat8)], [], ["update"]),
	})
}
// node src/_parent/test_1.js --network https://ic0.app
; (async () => {
	
	const canisters = await getCanisters(host)
	const identity = await getIdentity(id)
	const agent = getAgent(host, identity)
	const childActor = Actor.createActor(childInterface, { agent, canisterId: canisters.parent[hostType(host)] })

		const child_wasm = await fs.readFile('./build/child/latest/child.wasm')

	await childActor.upgrade([...child_wasm])
})()
