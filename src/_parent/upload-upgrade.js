const fs = require('fs/promises')
const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')

const { getCanisters, getAgent, hostType } = require('../_meta/shared/utils')
const { getFiles, uploadFile } = require('../_meta/shared/assets')
const { getIdentity } = require('../_meta/shared/identity')
const { parentFactory } = require('../_meta/shared/idl')

const argv = minimist(process.argv.slice(2))
const host = argv.network ?? 'http://localhost:8000'
const id = argv.identity ?? 'default'

// node src/_parent/upload-assets.js --network https://ic0.app --identity with-wallet
; (async () => {

	const canisters = await getCanisters(host)
	const identity = await getIdentity(id)
	const agent = getAgent(host, identity)
	const actor = Actor.createActor(parentFactory, { agent, canisterId: canisters.parent[hostType(host)] })

	// upload wasm
	const wasm = await fs.readFile('./build/canister/upgrade/0.0.1/child.wasm')

	const upgrade = { version: '0.0.1', upgrade_from: '0.0.0', timestamp: new Date().valueOf(), wasm: Array.from(wasm), wasm_hash: '0.0.1', assets: [] }
	await actor.create_upgrade(upgrade)

	// let res = await actor.get_next_upgrade('0.0.0')
	// console.log(res)

})()
