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

		const version = '0.0.2'
		const upgrade = await actorParent.get_upgrades()
		const upgradeExist = upgrade.find(u => u.version === version)

		if(upgradeExist) {
			await actorParent.remove_upgrade(version).then( a => console.log(a))
		}
	})

	jest.setTimeout(60000)
	
	test('Should create a new community', async () => {
		
		// create child
		if (canisterIds.ledger) {
			const accountId = getAccountId(canisterIds.parent.local, principal)
			await transferIcpToAccount(accountId)
		}
		const childPrincipalId = await actorParent.create_child().then(p => p.Ok.toString())
		
		// upload upgrade
		spawnSync('node', ['./src/_parent/upload-upgrade.js'] ,{cwd: process.cwd(), stdio: 'inherit'})
		
		// get child upgrade
		const actorChild = Actor.createActor(childFactory, { agent, canisterId: childPrincipalId })
		const resNextUpgrade = await actorChild.get_next_upgrade()
		const [ upgrade ] = resNextUpgrade.Ok
		expect(upgrade).toBeDefined()

		// upgrade child
		await actorChild.upgrade_canister(upgrade.wasm_hash)
		console.log(`http://${childPrincipalId}.localhost:8000/`)
		
	})

})
