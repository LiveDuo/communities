const { Actor } = require('@dfinity/agent')
const { ethers } = require('ethers')

const { setupTests, checkDfxRunning, getAgent, getCanisters } = require('../src/_meta/shared/utils')
const { getEthereumIdentity, getSignatureAndMessage } = require('../src/_meta/shared/identity')
const { childFactory } = require('../src/_meta/shared/idl')

setupTests()

describe('Testing with done', () => {

	let actorBackend, signer, identity

	beforeAll(async () => {

		// check ic replica
		await checkDfxRunning()

		// get random identity
		signer = ethers.Wallet.createRandom()
		identity = await getEthereumIdentity(signer)
		
		// create child actor
		const canisters = await getCanisters()
		const agent = getAgent('http://localhost:8000', identity)
		actorBackend = Actor.createActor(childFactory, { agent, canisterId: canisters.child.local })

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

		// get user last post
		const addressSigner =await signer.getAddress()
		const userPosts = await actorBackend.get_posts_by_user({Evm: { address: addressSigner.toLowerCase()}})
		const userLastPost = userPosts.Ok[userPosts.Ok.length - 1]
		expect(userLastPost.title).toBe('hello')
		// expect(userLastPost.address).toBe(addressSigner.toLowerCase())

	})

})
