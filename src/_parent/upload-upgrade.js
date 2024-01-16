const fs = require('fs/promises')
const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')	

const { getCanisters, getAgent, getHost } = require('../_meta/shared/utils')
const { getFiles, addToBatch, executeBatch } = require('../_meta/shared/assets')
const { getIdentity } = require('../_meta/shared/identity')
const { parentFactory, assetFactory } = require('../_meta/shared/idl')

const argv = minimist(process.argv.slice(2))
const network = argv.network ?? 'local'
const id = argv.identity ?? 'default'

const version = argv.version ?? '0.0.1'
const upgradeFromVersion = argv.upgradeFromVersion ?? null
const upgradeFromTrack = argv.upgradeFromTrack ?? null
const track = argv.track ?? 'default'
const description = argv.description ?? 'upgrade to 0.0.1'
const path = argv.path ?? './build/child'
const filter = argv.filter ?? null


// node src/_parent/upload-upgrade.js --network ic --upgradeFromTrack default --identity with-wallet
// npm run upload:upgrade -- --path ./build/child-test --filter child.wasm
; (async () => {

	const canisters = await getCanisters(network)
	const identity = await getIdentity(id)
	const agent = getAgent(getHost(network), identity)
	const actorParent = Actor.createActor(parentFactory, { agent, canisterId: canisters.parent[network] })
	const actorAsset = Actor.createActor(assetFactory, { agent, canisterId: canisters.parent[network] })

	// check upgrade version
	const upgrades = await actorParent.get_upgrades()
	const upgradeExists = upgrades.find(u => u.version === version && u.track.name === track)
	if (upgradeExists) { console.log('Version already exist\n'); return }

	const batches = [{batchSize: 0, items: []}]

	// upload upgrade assets
	const assets = await getFiles(`${path}/${version}`).then(e => e.filter(f => filter === f || filter === null))
	for (let asset of assets) {
		const assetBuf = await fs.readFile(`${path}/${version}/${asset}`)
		addToBatch(batches, assetBuf,`/upgrades/${track}/${version}/${asset}`)
	}

	await executeBatch(actorAsset, batches)

	// create upgrade
	const upgradeFrom = upgradeFromVersion && upgradeFromTrack ? [ {version: upgradeFromVersion, track: upgradeFromTrack} ] : []
	const res = await actorParent.create_upgrade(version, upgradeFrom, assets.map(a => `/upgrades/${track}/${version}/${a}`), track, description)
	console.log(res)
})()
