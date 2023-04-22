const { Actor } = require('@dfinity/agent')

const { checkDfxRunning, setupTests, getAgent, getCanisters, transferIcpToAccount } = require('../src/_meta/shared/utils')
const { getAccountId }= require('../src/_meta/shared/account')
const { getRandomIdentity } = require('../src/_meta/shared/identity')
const { parentFactory, childFactory } = require('../src/_meta/shared/idl')

setupTests()

describe.only('Testing with done', () => {

	let actorParent, agent, principal, canisterIds

	beforeAll(async () => {

		// check ic replica
		await checkDfxRunning()

    	// create parent actor
		canisterIds = await getCanisters()
		const identity = await getRandomIdentity()
		principal = identity.getPrincipal().toString()
		agent = getAgent('http://localhost:8000', identity)
    actorParent = Actor.createActor(parentFactory, { agent, canisterId: canisterIds.parent.local })

	})

	test('Should create a new community', async () => {

		// send icp
		if (canisterIds.ledger) {
			const accountId = getAccountId(canisterIds.parent.local, principal)
			await transferIcpToAccount(accountId)
		}

		// // upgrade child
		const childPrincipalId = await actorParent.create_child().then(p => p.Ok.toString())
		const actorChild = Actor.createActor(childFactory, { agent, canisterId: childPrincipalId })
		await actorChild.upgrade_canister()
		console.log(`http://${childPrincipalId}.localhost:8000/`)
		
	})

})
