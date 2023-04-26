const { Actor } = require('@dfinity/agent')
const { spawnSync } = require('node:child_process')

const { checkDfxRunning, setupTests, getAgent, getCanisters, transferIcpToAccount } = require('../src/_meta/shared/utils')
const { getAccountId }= require('../src/_meta/shared/account')
const { getIdentity } = require('../src/_meta/shared/identity')
const { parentFactory, childFactory } = require('../src/_meta/shared/idl')

setupTests()

describe.only('Testing with done', () => {

	let actorParent, agent, principal, canisterIds

	beforeAll(async () => {
		// check ic replica
		await checkDfxRunning()

    // create parent actor
		canisterIds = await getCanisters()
		const identity = await getIdentity("default")
		principal = identity.getPrincipal().toString()
		agent = getAgent('http://localhost:8000', identity)
    actorParent = Actor.createActor(parentFactory, { agent, canisterId: canisterIds.parent.local })

		const versions = ['0.0.2', '0.0.2b']
		const upgrades = await actorParent.get_upgrades()
		const upgradeExist = upgrades.filter(u => versions.includes(u.version))

		for (const upgrade of upgradeExist) {
			await actorParent.remove_upgrade(upgrade.version)
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
		
		// upload upgrade
		spawnSync('node', ['./src/_parent/upload-upgrade.js'] ,{cwd: process.cwd(), stdio: 'inherit'})
		
		// get child upgrade
		const resNextUpgrade = await actorChild.get_next_upgrade()
		const [ upgrade ] = resNextUpgrade.Ok
		expect(upgrade).toBeDefined()
		
		// upgrade child
		await actorChild.upgrade_canister(upgrade.wasm_hash)
		
		// upload broken version
		spawnSync('node', ['./src/_parent/upload-upgrade.js', '--version', '0.0.2b', '--versionFrom', '0.0.2'] ,{cwd: process.cwd(), stdio: 'inherit'})

		const resNextUpgrade1 = await actorChild.get_next_upgrade()
		const [ upgrade1 ] = resNextUpgrade1.Ok
		expect(upgrade1).toBeDefined()

		await actorChild.upgrade_canister(upgrade1.wasm_hash)

		const posts = await actorChild.get_posts()
		expect(posts.length).toBe(0)
		// call canister
		console.log(`http://${childPrincipalId}.localhost:8000/`)
		
	})

})
