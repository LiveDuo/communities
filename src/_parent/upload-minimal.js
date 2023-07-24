const fs = require('fs/promises')
const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')

const { getCanisters, getAgent, hostType } = require('../_meta/shared/utils')
const { getFiles, uploadFile } = require('../_meta/shared/assets')
const { getIdentity } = require('../_meta/shared/identity')
const { assetFactory, parentFactory } = require('../_meta/shared/idl')

// https://forum.dfinity.org/t/webpack-proxy-econnrefused-for-proxy-to-api/9263/2?u=liveduo
// https://forum.dfinity.org/t/development-workflow-quickly-test-code-modifications/1793/22?u=liveduo

const argv = minimist(process.argv.slice(2))
const host = argv.network ?? 'http://127.0.0.1:8000'
const id = argv.identity ?? 'default'
const version = argv.version ?? '0.0.1'

// node src/_parent/upload-assets.js --network https://ic0.app --identity with-wallet
; (async () => {

	const canisters = await getCanisters(host)
	const identity = await getIdentity(id)
	const agent = getAgent(host, identity)
	const actorAsset = Actor.createActor(assetFactory, { agent, canisterId: canisters.parent[hostType(host)] })
	const actorParent = Actor.createActor(parentFactory, { agent, canisterId: canisters.parent[hostType(host)] })

	// upload child assets
	const assetBuf = await fs.readFile(`./build/child/${version}/child.wasm`)
	await uploadFile(actorAsset, `/upgrade/${version}/child.wasm`, assetBuf)

	// create upgrade
	const assetsWithPath =  [`/upgrade/${version}/child.wasm`]
	const res = await actorParent.create_upgrade(version, [], assetsWithPath)
	if (res.Err) {
		console.log('This version already exist')
	}
})()