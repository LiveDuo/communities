const fs = require('fs/promises')
const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')

const { getCanisters, getAgent, hostType } = require('../_meta/shared/utils')
const { getFiles, uploadFile } = require('../_meta/shared/assets')
const { getIdentity } = require('../_meta/shared/identity')
const { assetFactory } = require('../_meta/shared/idl')

const argv = minimist(process.argv.slice(2))
const host = argv.network ?? 'http://localhost:8000'
const id = argv.identity ?? 'default'

// node src/_parent/upload-assets.js --network https://ic0.app --identity with-wallet
; (async () => {

	const canisters = await getCanisters(host)
	const identity = await getIdentity(id)
	const agent = getAgent(host, identity)
	const actor = Actor.createActor(assetFactory, { agent, canisterId: canisters.parent[hostType(host)] })

	// upload wasm
	const wasm = await fs.readFile('./build/canister/child.wasm')
	await uploadFile(actor, '/child/child.wasm', wasm)
	
	// upload domain file
	const domains = await fs.readFile('./build/domains/index.txt')
	await uploadFile(actor, '/.well-known/ic-domains', domains)

	// upload parent assets
	const assetsParent = await getFiles('./build/parent')
	for (let asset of assetsParent) {
		const assetBuf = await fs.readFile(`build/parent/${asset}`)
		await uploadFile(actor, `/${asset}`, assetBuf)
	}

	// upload child assets
	const assetsChild = await getFiles('./build/child')
	for (let asset of assetsChild) {
		const assetBuf = await fs.readFile(`build/child/${asset}`)
		await uploadFile(actor, `/child/${asset}`, assetBuf)
	}

})()
