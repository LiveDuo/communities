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
const versionFrom = argv.versionFrom ?? '0.0.1'
const track = argv.track ?? 'stable'

// node src/_parent/upload-upgrade.js --network https://ic0.app --identity with-wallet
; (async () => {

	const canisters = await getCanisters(host)
	const identity = await getIdentity(id)
	const agent = getAgent(host, identity)
	const actorParent = Actor.createActor(parentFactory, { agent, canisterId: canisters.parent[hostType(host)] })
	const actorAsset = Actor.createActor(assetFactory, { agent, canisterId: canisters.parent[hostType(host)] })

	// check upgrade version
	const upgrades = await actorParent.get_upgrades()
	const wasm = await fs.readFile(`./build/child/${version}/child.wasm`)
	const upgradeExists = upgrades.find(u => Buffer.from(u.wasm_hash).toString('hex') === sha256(wasm))
	if (upgradeExists) { console.log('Version already exist\n'); return }

	// upload upgrade assets
	const assets = await getFiles(`./build/child/${version}`)
	for (let asset of assets) {
		const assetBuf = await fs.readFile(`./build/child/${version}/${asset}`)
		await uploadFile(actorAsset, `/upgrade/${version}/${asset}`, assetBuf)
	}

	// create upgrade
	const wasmVersionFrom = await fs.readFile(`./build/child/${versionFrom}/child.wasm`)
	const upgradeFromBuffer = Buffer.from(sha256(wasmVersionFrom), 'hex')
	const res = await actorParent.create_upgrade(`${version}`, Array.from(upgradeFromBuffer), assets.map(a => `/upgrade/${version}/${a}`), track)
	console.log(res)
})()
