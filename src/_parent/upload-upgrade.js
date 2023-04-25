const fs = require('fs/promises')
const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')
const { createHash } = require('crypto');

const { getCanisters, getAgent, hostType } = require('../_meta/shared/utils')
const { getFiles, uploadFile } = require('../_meta/shared/assets')
const { getIdentity } = require('../_meta/shared/identity')
const { parentFactory, assetFactory } = require('../_meta/shared/idl')

const argv = minimist(process.argv.slice(2))
const host = argv.network ?? 'http://localhost:8000'
const id = argv.identity ?? 'default'

// node src/_parent/upload-assets.js --network https://ic0.app --identity with-wallet
; (async () => {

	const canisters = await getCanisters(host)
	const identity = await getIdentity(id)
	const agent = getAgent(host, identity)
	const actorParent = Actor.createActor(parentFactory, { agent, canisterId: canisters.parent[hostType(host)] })
	const actorAsset = Actor.createActor(assetFactory, { agent, canisterId: canisters.parent[hostType(host)] })

	const upgrades = await actorParent.get_upgrades()
	const wasm = await fs.readFile('./build/child/0.0.1/child.wasm')
	const wasmHash = createHash('sha256').update(wasm).digest('hex');
	const existUpgrade = upgrades.find(u => Buffer.from(u.wasm_hash).toString('hex') === wasmHash)

	if (existUpgrade) {
		console.log('Version already exist')
		console.log()
		return
	}

	const version = "0.0.1"

	const assets = await getFiles(`./build/child/${version}`)
	for (let asset of assets) {
		const assetBuf = await fs.readFile(`./build/child/${version}/${asset}`)
		await uploadFile(actorAsset, `/upgrade/${version}/${asset}`, assetBuf)
	}

	const upgradeFromBytes = await fs.readFile('./build/child/latest/child.wasm')
	const upgradeFromHash = createHash('sha256').update(upgradeFromBytes).digest('hex');
	
	const upgradeFromBuffer = Buffer.from(upgradeFromHash, 'hex')
	const assetsWithPath =  assets.map(a => `/upgrade/${version}/${a}`)

	await actorParent.create_upgrade(version, Array.from(upgradeFromBuffer), assetsWithPath)
})()
