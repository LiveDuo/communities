const fs = require('fs/promises')
const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')
const { createHash } = require('crypto')

const { getCanisters, getAgent, hostType } = require('../_meta/shared/utils')
const { getFiles, uploadFile } = require('../_meta/shared/assets')
const { getIdentity } = require('../_meta/shared/identity')
const { assetFactory, parentFactory } = require('../_meta/shared/idl')

const argv = minimist(process.argv.slice(2))
const host = argv.network ?? 'http://localhost:8000'
const id = argv.identity ?? 'default'

const version = '0.0.1'

// node src/_parent/upload-assets.js --network https://ic0.app --identity with-wallet
; (async () => {

	const canisters = await getCanisters(host)
	const identity = await getIdentity(id)
	const agent = getAgent(host, identity)
	const actorAsset = Actor.createActor(assetFactory, { agent, canisterId: canisters.parent[hostType(host)] })
	const actorParent = Actor.createActor(parentFactory, { agent, canisterId: canisters.parent[hostType(host)] })

	// upload domain file
	const domains = await fs.readFile('./build/domains/index.txt')
	await uploadFile(actorAsset, '/.well-known/ic-domains', domains)

	// upload parent assets
	const assetsParent = await getFiles('./build/parent')
	for (let asset of assetsParent) {
		const assetBuf = await fs.readFile(`build/parent/${asset}`)
		await uploadFile(actorAsset, `/${asset}`, assetBuf)
	}

	// upload child assets
	const assetsChild = await getFiles(`./build/child/${version}`)
	for (let asset of assetsChild) {
		const assetBuf = await fs.readFile(`./build/child/${version}/${asset}`)
		await uploadFile(actorAsset, `/upgrade/${version}/${asset}`, assetBuf)
	}

	// create upgrade
	const assetsWithPath =  assetsChild.map(a => `/upgrade/${version}/${a}`)
	await actorParent.create_upgrade(version, [], assetsWithPath)

})()
