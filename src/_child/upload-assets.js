const fs = require('fs/promises')
const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')

const { getCanisters, getAgent, hostType } = require('../_meta/shared/utils')
const { getFiles, uploadFile } = require('../_meta/shared/assets')
const { getIdentity } = require('../_meta/shared/identity')
const { assetFactory } = require('../_meta/shared/idl')

const argv = minimist(process.argv.slice(2))
const host = argv.network ?? 'http://127.0.0.1:8000'
const id = argv.identity ?? 'default'

// node src/_child/upload-assets.js --network https://ic0.app --identity with-wallet
; (async () => {

	const canisters = await getCanisters(host)
	const identity = await getIdentity(id)
	const agent = getAgent(host, identity)
	const actor = Actor.createActor(assetFactory, { agent, canisterId: canisters.child[hostType(host)] })

	// upload assets
	const assetsChild = await getFiles('./build/child')
	for (let asset of assetsChild) {
		const assetBuf = await fs.readFile(`build/child/${asset}`)
		await uploadFile(actor, `/${asset}`, assetBuf)
	}

})()
