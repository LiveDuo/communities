const fs = require('fs/promises')
const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')

const { getCanisters, getAgent, getHost } = require('../_meta/shared/utils')
const { uploadFile } = require('../_meta/shared/assets')
const { getIdentity } = require('../_meta/shared/identity')
const { assetFactory, parentFactory } = require('../_meta/shared/idl')

// https://forum.dfinity.org/t/webpack-proxy-econnrefused-for-proxy-to-api/9263/2?u=liveduo
// https://forum.dfinity.org/t/development-workflow-quickly-test-code-modifications/1793/22?u=liveduo

const argv = minimist(process.argv.slice(2))
const network = argv.network ?? 'network'
const id = argv.identity ?? 'default'
const version = argv.version ?? '0.0.1'
const track = argv.track ?? 'default'
const description = argv.description ?? 'upgrade to 0.0.1'

// node src/_parent/upload-minimal.js --network https://ic0.app --identity with-wallet
; (async () => {

	const canisters = await getCanisters(network)
	const identity = await getIdentity(id)
	const agent = getAgent(getHost(network), identity)
	const actorAsset = Actor.createActor(assetFactory, { agent, canisterId: canisters.parent[network] })
	const actorParent = Actor.createActor(parentFactory, { agent, canisterId: canisters.parent[network] })

	// upload child assets
	const assetBuf = await fs.readFile(`./build/child/${version}/child.wasm`)
	await uploadFile(actorAsset, `/upgrades/${track}/${version}/child.wasm`, assetBuf)

	// create upgrade
	const assetsWithPath =  [`/upgrades/${track}/${version}/child.wasm`]
	const res = await actorParent.create_upgrade(version, [], assetsWithPath, track, description)
	if (res.Err) {
		console.log('This version already exist')
	}
})()
