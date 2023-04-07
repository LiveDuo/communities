const { Actor } = require('@dfinity/agent')

const { checkDfxRunning, setupTests, getAgent, getCanisters } = require('../src/_meta/shared/utils')
const { getRandomIdentity } = require('../src/_meta/shared/identity')
const { parentFactory } = require('../src/_meta/shared/idl')

setupTests()

describe.only('Testing with done', () => {

	let actorParent

	beforeAll(async () => {

		// check ic replica
		await checkDfxRunning()

    	// create parent actor
		const canisters = await getCanisters()
		const identity = await getRandomIdentity()
		const agent = getAgent('http://localhost:8000', identity)
    	actorParent = Actor.createActor(parentFactory, { agent, canisterId: canisters.parent.local })

	})

	test('Should create a new community', async () => {

		// create child actor
		const childPrincipalid = await actorParent.create_child().then(p => p.Ok.toString())
		expect(childPrincipalid).toBeDefined()
		
		// print child canister
		console.log('Child Principal id:', childPrincipalid)
	})

})
