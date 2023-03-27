
const { checkDfxRunning, setupTests, getParentActor, getAgent, getRandomIdentity, transferIcpToAccount } = require('./utils')

setupTests()

describe.only('Testing with done', () => {

	let actorParent

	beforeAll(async () => {
		await checkDfxRunning()

		const identity = await getRandomIdentity()
		const agent = await getAgent(identity)
		actorParent = await getParentActor(agent)
	})

	test('Should create a new ...', async () => {

		// create child actor
		const childPrincipalid = await actorParent.create_child().then(p => p.Ok.toString())
		expect(childPrincipalid).toBeDefined()
		
		// print child canister
		console.log('Child Principal id:', childPrincipalid)
	})

})
