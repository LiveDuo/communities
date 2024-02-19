const { Actor } = require('@dfinity/agent')
const { spawnSync } = require('node:child_process')

const { checkDfxRunning, setupTests, getAgent, getCanisters, transferIcpToAccount, sleep } = require('../src/_meta/shared/utils')
const { getAccountId }= require('../src/_meta/shared/account')
const { getIdentity } = require('../src/_meta/shared/identity')
const { parentFactory, childFactory } = require('../src/_meta/shared/idl')

const UPGRADE_DELAY = 2000 // 2 sec

setupTests()
describe.only('Testing with done', () => {

	let actorParent, agent, principal, canisterIds

	beforeAll(async () => {
		// check ic replica
		await checkDfxRunning()

    	// create parent actor
		canisterIds = await getCanisters('local')
		const identity = await getIdentity("default")
		principal = identity.getPrincipal().toString()
		agent = getAgent('http://127.0.0.1:8000', identity)
    	actorParent = Actor.createActor(parentFactory, { agent, canisterId: canisterIds.parent.local })
	})

	beforeEach(async()=>{
		// remove upgrades
		const versions = [{version: '0.0.2', track: 'default'}, {version: '0.0.2b', track: 'default'}, {version: '0.0.2', track: 'beta'}]
		const upgrades = await actorParent.get_upgrades()
		const upgradesExist = upgrades.filter(u => versions.some(v => v.version === u.version && v.track === u.track.name))
		for (const upgrade of upgradesExist) {
			await actorParent.remove_upgrade(upgrade.version, upgrade.track.name)
		}
	})

	jest.setTimeout(120000)
	
	test('Should create a new community', async () => {
		
		// create child
		if (canisterIds.ledger) {
			const accountId = getAccountId(canisterIds.parent.local, principal)
			await transferIcpToAccount(accountId)
		}
		const childPrincipalId = await actorParent.create_child().then(p => p.Ok.toString())
		const actorChild = Actor.createActor(childFactory, { agent, canisterId: childPrincipalId })
		console.log(`http://${childPrincipalId}.localhost:8000/`)
		
		// upload upgrade (0.0.2)
		const tractUpgrade = 'default'
		spawnSync('node', ['./src/_parent/upload-upgrade.js', '--version', '0.0.2' ,'--description', 'description for 0.0.2', '--upgradeFromVersion', '0.0.1', '--upgradeFromTrack', 'default', '--track', tractUpgrade, '--path' ,'./build/child-test' ] ,{cwd: process.cwd(), stdio: 'inherit'})
		
		// get child upgrade
		const resNextUpgrades = await actorChild.get_next_upgrades()
		const [ upgrade ] = resNextUpgrades.Ok
		expect(upgrade).toBeDefined()

		await actorChild.upgrade_canister(upgrade.version, upgrade.track.name)

		await sleep(UPGRADE_DELAY)
		
		// check metadata
		const metadata = await actorChild.get_metadata()
		expect(metadata.Ok.version).toBe(upgrade.version)
		expect(metadata.Ok.track).toBe(upgrade.track.name)

		// upload version (0.0.2b)
		const tractUpgrade1 = 'default'
		spawnSync('node', ['./src/_parent/upload-upgrade.js', '--version', '0.0.2b','--description', 'description for 0.0.2b', '--upgradeFromVersion', '0.0.2', '--upgradeFromTrack', 'default', '--track', tractUpgrade1, '--path' ,'./build/child-test'] ,{cwd: process.cwd(), stdio: 'inherit'})

		// get child upgrade
		const resNextUpgrades1 = await actorChild.get_next_upgrades()
		const [ upgrade1 ] = resNextUpgrades1.Ok
		expect(upgrade1).toBeDefined()

		// upgrade child (0.0.2b)
		await actorChild.upgrade_canister(upgrade1.version, upgrade1.track.name)

		await sleep(UPGRADE_DELAY)

		// check metadata
		const metadata1 = await actorChild.get_metadata()
		expect(metadata1.Ok.version).toBe(upgrade.version)
		expect(metadata1.Ok.track).toBe(upgrade.track.name)

		// check canister
		const posts = await actorChild.get_posts()
		expect(posts.length).toBe(0)
	})

	test('Should create a new community and upgrade in beta track', async () => {
		
		// create child
		if (canisterIds.ledger) {
			const accountId = getAccountId(canisterIds.parent.local, principal)
			await transferIcpToAccount(accountId)
		}
		const childPrincipalId = await actorParent.create_child().then(p => p.Ok.toString())
		const actorChild = Actor.createActor(childFactory, { agent, canisterId: childPrincipalId })
		console.log(`http://${childPrincipalId}.localhost:8000/`)

		// create track (beta)
		const tractUpgrade = 'beta'
		const resCreateTrack = await actorParent.create_track(tractUpgrade)
		expect(resCreateTrack.Ok).toBeDefined()

		// upload upgrade (0.0.2-beta)
		spawnSync('node', ['./src/_parent/upload-upgrade.js', '--version', '0.0.2','--description', 'description for 0.0.2 beta', '--upgradeFromVersion', '0.0.1', '--upgradeFromTrack', 'default', '--track', tractUpgrade, '--path' ,'./build/child-test' ] ,{cwd: process.cwd(), stdio: 'inherit'})
		
		// get child upgrade
		const resNextUpgrades = await actorChild.get_next_upgrades()
		const [ upgrade ] = resNextUpgrades.Ok
		expect(upgrade).toBeDefined()
		
		// upgrade child (0.0.2-beta)
		await actorChild.upgrade_canister(upgrade.version, upgrade.track.name)

		await sleep(UPGRADE_DELAY)

		// check metadata
		const metadata = await actorChild.get_metadata()
		expect(metadata.Ok.version).toBe(upgrade.version)
		expect(metadata.Ok.track).toBe(upgrade.track.name)
		
		// check canister
		const posts = await actorChild.get_posts()
		expect(posts.length).toBe(0)

		// remove track (beta)
		const resRemoveTrack = await actorParent.remove_track(tractUpgrade)
		expect(resRemoveTrack.Ok).toBeDefined()
	})
})
