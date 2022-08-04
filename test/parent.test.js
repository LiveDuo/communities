
const { checkDfxRunning, setupTests, getParentActor, getAgent } = require('./utils')

setupTests()

describe.only('Testing with done', () => {

	let actorParent

	beforeAll(async () => {
		await checkDfxRunning()

		const agent = await getAgent()
		actorParent = await getParentActor(agent)
	})

	test('Should create a new ...', async () => {
		// create child actor
		const childPrincipalid = await actorParent.create_child_canister().then(p => p.Ok.toString())
		expect(childPrincipalid).toBeDefined()
	})

})
