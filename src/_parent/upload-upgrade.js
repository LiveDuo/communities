const fs = require('fs/promises')
const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')
const CryptoJS = require('crypto-js')

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

	const assets = await getFiles('./build/canister/upgrade/0.0.1')
	for (let asset of assets) {
		const assetBuf = await fs.readFile(`./build/canister/upgrade/0.0.1/${asset}`)
		await uploadFile(actorAsset, `/upgrade/0.0.1/${asset}`, assetBuf)
	}

	const assetsWithPath =  assets.map(a => `/upgrade/0.0.1/${a}`)
	const upgradeFrom = await fs.readFile('./build/canister/child.wasm')

	await actorParent.create_upgrade('0.0.1', Array.from(upgradeFrom), assetsWithPath)

})()
