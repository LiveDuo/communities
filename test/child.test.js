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
		const profile = await actorBackend.link_address(loginMessageHash, signature)
		expect(profile.address).toBe(signerAddress.toLowerCase())
		
		// check profile and principal
		const profile2 = await actorBackend.get_own_profile()
		expect(profile2.address).toBe(signerAddress.toLowerCase())
		const principal2 = await actorBackend.get_own_principal()
		const [profile3] = await actorBackend.get_profile_by_principal(principal2)
		expect(profile3.address).toBe(signerAddress.toLowerCase())

		// set username
		await actorBackend.setName('name')
		const [profile4] = await actorBackend.get_profile_by_name('name')
		expect(profile4.address).toBe(signerAddress.toLowerCase())
		await actorBackend.setName('')

		// check other profiles
		const [principal] = await actorBackend.get_principal_by_eth(signerAddress.toLowerCase())
		const [profile5] = await actorBackend.get_profile_by_principal(principal)
		expect(profile5.address).toBe(signerAddress.toLowerCase())

		const [profile6] = await actorBackend.get_profile_by_eth(signerAddress.toLowerCase())
		expect(profile6.address).toBe(signerAddress.toLowerCase())
		
	})
	
	test('Should write on the wall', async () => {
		
		// write to wall
		await actorBackend.create_post('hello')
		
		// check general wall
		const principal = await actorBackend.get_own_principal()
		const posts = await actorBackend.get_posts('', 0)
		const lastPost = posts[posts.length - 1]
		expect(lastPost.text).toBe('hello')
		expect(lastPost.principal_id).toBe(principal.toString())
		
		// check user wall
		const userPosts = await actorBackend.get_posts(principal.toString(), 0)
		const userLastPost = userPosts[userPosts.length - 1]
		expect(userLastPost.text).toBe('hello')
		expect(userLastPost.principal_id).toBe(principal.toString())

	})

})
