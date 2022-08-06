const { setupTests, checkDfxRunning, getAgent, getParentActor, getChildActor, 
	getEthereumIdentity, getSignatureAndMessage, transferIcpToAccount } = require('./utils')

setupTests()

describe('Testing with done', () => {

	let actorBackend, signer

	beforeAll(async () => {

		// check ic replica
		await checkDfxRunning()

		// get random identity
		const {identity, signerRandom} = await getEthereumIdentity()
		signer = signerRandom
		
		// get parent actor
		const agent = await getAgent(identity)
		const actorParent = await getParentActor(agent)
		
		// transfer icp to canister
		const callerAccountId = await actorParent.caller_account_id()
		await transferIcpToAccount(callerAccountId)

		// create child actor
		const childPrincipalid = await actorParent.create_child_canister().then(p => p.Ok.toString())
		actorBackend = await getChildActor(agent, childPrincipalid)

	})

	test('Should sign in with ethereum', async () => {

		// link address
		const signerAddress = await signer.getAddress()
		const {signature, loginMessageHash} = await getSignatureAndMessage(signer)
		const profile = await actorBackend.linkAddress(loginMessageHash, signature)
		expect(profile.address).toBe(signerAddress.toLowerCase())
		
		// check profile and principal
		const profile2 = await actorBackend.getOwnProfile()
		expect(profile2.address).toBe(signerAddress.toLowerCase())
		const principal2 = await actorBackend.getOwnPrincipal()
		const [profile3] = await actorBackend.getProfileByPrincipal(principal2)
		expect(profile3.address).toBe(signerAddress.toLowerCase())

		// set username
		await actorBackend.setName('name')
		const [profile4] = await actorBackend.getProfileByName('name')
		expect(profile4.address).toBe(signerAddress.toLowerCase())
		await actorBackend.setName('')

		// check other profiles
		const [principal] = await actorBackend.getPrincipalByEth(signerAddress.toLowerCase())
		const [profile5] = await actorBackend.getProfileByPrincipal(principal)
		expect(profile5.address).toBe(signerAddress.toLowerCase())

		const [profile6] = await actorBackend.getProfileByEth(signerAddress.toLowerCase())
		expect(profile6.address).toBe(signerAddress.toLowerCase())
		
	})
	
	test('Should write on the wall', async () => {
		
		// write to wall
		await actorBackend.write('hello')
		
		// check general wall
		const principal = await actorBackend.getOwnPrincipal()
		const posts = await actorBackend.wall('', 0)
		const lastPost = posts[posts.length - 1]
		expect(lastPost.text).toBe('hello')
		expect(lastPost.principal_id).toBe(principal.toString())
		
		// check user wall
		const userPosts = await actorBackend.wall(principal.toString(), 0)
		const userLastPost = userPosts[userPosts.length - 1]
		expect(userLastPost.text).toBe('hello')
		expect(userLastPost.principal_id).toBe(principal.toString())

	})

})
