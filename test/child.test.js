const { setupTests, checkDfxRunning, getAgent, getChildActor,getEthereumIdentity, getSignatureAndMessage , getCanisters} = require('./utils')


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

		// create child actor
		const canisters = await getCanisters()
		actorBackend = await getChildActor(agent, canisters['child'].local)

	})

	test('Should sign in with ethereum', async () => {

		// link address
		const signerAddress = await signer.getAddress()
		const {signature, loginMessageHash} = await getSignatureAndMessage(signer)
		const profile = await actorBackend.create_profile({Evm: { signature,  message: loginMessageHash }})
		const address =  profile.Ok.authentication.Evm.address
		expect(address).toBe(signerAddress.toLowerCase())
		
		// // check profile and principal
		const profile2 = await actorBackend.get_profile()
		const address2 =  profile2.Ok.authentication.Evm.address
		expect(address2).toBe(signerAddress.toLowerCase())
		
	})
	
	test('Should create and get a post', async () => {
		
		// create a post
		await actorBackend.create_post('hello', '')
		
		// get user posts
		const addressSigner =await signer.getAddress()
		const posts = await actorBackend.get_posts()
		const lastPost = posts[posts.length - 1]
		expect(lastPost.title).toBe('hello')
		expect(lastPost.address).toBe(addressSigner.toLowerCase())
		
		// get user last post
		const userPosts = await actorBackend.get_posts()
		const userLastPost = userPosts[userPosts.length - 1]
		expect(userLastPost.title).toBe('hello')
		expect(userLastPost.address).toBe(addressSigner.toLowerCase())

	})

})
