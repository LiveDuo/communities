const fs = require('fs/promises')
const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')
const { createHash } = require('crypto')

const { getCanisters, getAgent, hostType } = require('../_meta/shared/utils')
const { getFiles, uploadFile } = require('../_meta/shared/assets')
const { getIdentity } = require('../_meta/shared/identity')
const { parentFactory, assetFactory } = require('../_meta/shared/idl')

const sha256 = (b) => createHash('sha256').update(b).digest('hex')

const argv = minimist(process.argv.slice(2))
const host = argv.network ?? 'http://127.0.0.1:8000'
const id = argv.identity ?? 'default'

const version = argv.version ?? '0.0.2'
const upgradeFromVersion = argv.upgradeFromVersion ?? '0.0.1'
const upgradeFromTrack = argv.upgradeFromTrack ?? 'default'
const track = argv.track ?? 'default'
const description = argv.description ?? 'upgrade to 0.0.2'

// node src/_parent/upload-upgrade.js --network https://ic0.app --identity with-wallet
; (async () => {

	const canisters = await getCanisters(host)
	const identity = await getIdentity(id)
	const agent = getAgent(host, identity)
	const actorParent = Actor.createActor(parentFactory, { agent, canisterId: canisters.parent[hostType(host)] })
	const actorAsset = Actor.createActor(assetFactory, { agent, canisterId: canisters.parent[hostType(host)] })

	// check upgrade version
	const upgrades = await actorParent.get_upgrades()
	const upgradeExists = upgrades.find(u => u.version === version && u.track === track)
	if (upgradeExists) { console.log('Version already exist\n'); return }

	// upload upgrade assets
	const assets = await getFiles(`./build/child/${version}`)
	for (let asset of assets) {
		const assetBuf = await fs.readFile(`./build/child/${version}/${asset}`)
		await uploadFile(actorAsset, `/upgrades/${track}/${version}/${asset}`, assetBuf)
	}

	// create upgrade
	const upgradeFrom = {version: upgradeFromVersion, track: upgradeFromTrack}
	const res = await actorParent.create_upgrade(version, [upgradeFrom], assets.map(a => `/upgrades/${track}/${version}/${a}`), track, description)
	console.log(res)
})()
