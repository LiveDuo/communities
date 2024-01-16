const fs = require('fs/promises')
const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')

const { getCanisters, getAgent, getHost } = require('../_meta/shared/utils')
const { getFiles, addToBatch, executeBatch } = require('../_meta/shared/assets')
const { getIdentity } = require('../_meta/shared/identity')
const { assetFactory } = require('../_meta/shared/idl')

const argv = minimist(process.argv.slice(2))
const network = argv.network ?? 'local'
const id = argv.identity ?? 'default'
const path = argv.path ?? './build/child'
const version = argv.version ?? '0.0.1'
// node src/_child/upload-assets.js --network ic --identity with-wallet
; (async () => {

	const canisters = await getCanisters(network)
	const identity = await getIdentity(id)
	const agent = getAgent(getHost(network), identity)
	const actor = Actor.createActor(assetFactory, { agent, canisterId: canisters.child[network] })

	const batches = [{batchSize: 0, items: []}]
	// upload assets
	const assetsChild = await getFiles(`${path}/${version}`)
	for (let asset of assetsChild) {
		const assetBuf = await fs.readFile(`${path}/${version}/${asset}`)
		addToBatch(batches, assetBuf, `/${asset}`)
	}

	await executeBatch(actor, batches)

})()
