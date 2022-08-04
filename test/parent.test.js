
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
		const childPrincipalid = await actorParent.create_child_canister().then(p => p.Ok.toString())
		expect(childPrincipalid).toBeDefined()
		
		const callerAccountId = await actorParent.caller_account_id()
		await transferIcpToAccount(callerAccountId)
		
		const childPrincipalid2 = await actorParent.create_canister().then(p => p.Ok.toString())
		expect(childPrincipalid2).toBeDefined()
		
	})

})
