const { setupTests, checkDfxRunning, getAgent, getParentActor, getChildActor, 
	getEthereumIdentity, getSignatureAndMessage, transferIcpToAccount } = require('./utils')

setupTests()

describe('Testing with done', () => {

	let actorBackend, signer, identity

	beforeAll(async () => {

		// check ic replica
		await checkDfxRunning()

		// get random identity
		const {identity: identityEthers, signerRandom} = await getEthereumIdentity()
		signer = signerRandom
		identity = identityEthers
		
		// get parent actor
		const agent = await getAgent(identity)
		const actorParent = await getParentActor(agent)
		
		// transfer icp to canister
		const callerAccountId = await actorParent.caller_account_id()
		await transferIcpToAccount(callerAccountId)

		// create child actor
		const childPrincipalid = await actorParent.create_child().then(p => p.Ok.toString())
		actorBackend = await getChildActor(agent, childPrincipalid)

	})

	test('Should sign in with ethereum', async () => {

		// link address
		const signerAddress = await signer.getAddress()
		const {signature, loginMessageHash} = await getSignatureAndMessage(signer)
		const profile = await actorBackend.update_profile_address(loginMessageHash, signature)
		expect(profile.address).toBe(signerAddress.toLowerCase())
		
		// check profile and principal
		const profile2 = await actorBackend.get_profile()
		expect(profile2.address).toBe(signerAddress.toLowerCase())

		// set username
		await actorBackend.update_profile(['name'], [])
		const profile4 = await actorBackend.get_profile()
		expect(profile4.address).toBe(signerAddress.toLowerCase())
		await actorBackend.update_profile([], [])

		// check other profiles
		const [profile6] = await actorBackend.get_profile_by_address(signerAddress.toLowerCase())
		expect(profile6.address).toBe(signerAddress.toLowerCase())
		
	})
	
	test('Should create and get a post', async () => {
		
		// create a post
		await actorBackend.create_post('hello', '')
		
		// get user posts
		const principal = identity.getPrincipal()
		const posts = await actorBackend.get_posts()
		const lastPost = posts[posts.length - 1]
		expect(lastPost.title).toBe('hello')
		expect(lastPost.principal_id).toBe(principal.toString())
		
		// get user last post
		const userPosts = await actorBackend.get_posts()
		const userLastPost = userPosts[userPosts.length - 1]
		expect(userLastPost.title).toBe('hello')
		expect(userLastPost.principal_id).toBe(principal.toString())

	})

})
