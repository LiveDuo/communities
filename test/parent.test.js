const { Actor } = require('@dfinity/agent')

const { checkDfxRunning, setupTests, getAgent, getCanisters, transferIcpToAccount } = require('../src/_meta/shared/utils')
const { getAccountId }= require('../src/_meta/shared/account')
const { getRandomIdentity } = require('../src/_meta/shared/identity')
const { parentFactory } = require('../src/_meta/shared/idl')

setupTests()

describe.only('Testing with done', () => {

	let actorParent, principal, canisterIds

	beforeAll(async () => {

		// check ic replica
		await checkDfxRunning()

    	// create parent actor
		canisterIds = await getCanisters()
		const identity = await getRandomIdentity()
		principal = identity.getPrincipal().toString()
		const agent = getAgent('http://127.0.0.1:8000', identity)
    	actorParent = Actor.createActor(parentFactory, { agent, canisterId: canisterIds.parent.local })

	})

	test('Should create a new community', async () => {
		if (canisterIds.ledger) {
			// create account
			const accountId = getAccountId(canisterIds.parent.local, principal)
			// send icp
			await transferIcpToAccount(accountId)
		}


		// create child actor
		const childPrincipalid = await actorParent.create_child().then(p => p.Ok.toString())
		expect(childPrincipalid).toBeDefined()
		
		// print child canister
		console.log('Child Principal id:', childPrincipalid)
	})

})
