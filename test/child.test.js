const { Actor } = require('@dfinity/agent')
const { ethers } = require('ethers')
const web3 = require('@solana/web3.js')
const bs58 = require('bs58')

const { setupTests, checkDfxRunning, getAgent, getCanisters } = require('../src/_meta/shared/utils')
const { getEthereumIdentity, getSignatureAndMessage, getSolanaIdentity, getSignatureAndMessageSvm } = require('../src/_meta/shared/identity')
const { childFactory } = require('../src/_meta/shared/idl')

setupTests()

describe('Testing with done', () => {

	let actorBackendEvm, actorBackendSvm, signerEvm, identityEvm, signerSvm, identitySvm

	beforeAll(async () => {

		// check ic replica
		await checkDfxRunning()

		// get random identity for emv
		signerEvm = ethers.Wallet.createRandom()
		identityEvm = await getEthereumIdentity(signerEvm)

		// get random identity for emv
		signerSvm = web3.Keypair.generate()
		identitySvm = await getSolanaIdentity(signerSvm)
		
		// create child actor
		const canisters = await getCanisters()

		const agentEvm = getAgent('http://localhost:8000', identityEvm)
		actorBackendEvm = Actor.createActor(childFactory, { agent: agentEvm, canisterId: canisters.child.local })

		const agentSvm = getAgent('http://localhost:8000', identitySvm)
		actorBackendSvm = Actor.createActor(childFactory, { agent: agentSvm, canisterId: canisters.child.local })

	})

	test('Should sign in with ethereum', async () => {

		// link address
		const signerAddress = await signerEvm.getAddress()
		const {signature, loginMessageHash} = await getSignatureAndMessage(signerEvm)
		const profile = await actorBackendEvm.create_profile({Evm: { signature,  message: loginMessageHash }})
		const address =  profile.Ok.authentication.Evm.address
		expect(address).toBe(signerAddress.toLowerCase())
		
		// // check profile and principal
		const profile2 = await actorBackendEvm.get_profile()
		const address2 =  profile2.Ok.authentication.Evm.address
		expect(address2).toBe(signerAddress.toLowerCase())
		
	})
	test("Should sign in with solana", async () => {
		const {loginMessageHash, signature} = getSignatureAndMessageSvm(signerSvm)
    const pubKey = Buffer.from(bs58.decode(signerSvm.publicKey.toString())).toString("hex");

    // link address
    const profile = await actorBackendSvm.create_profile({Svm: { public_key: pubKey, signature, message: loginMessageHash }});

    const address = profile.Ok.authentication.Svm.address;
    expect(address).toBe(signerSvm.publicKey.toString().toLowerCase());

    // check profile and principal
    const profile2 = await actorBackendSvm.get_profile()
    const address2 =  profile2.Ok.authentication.Svm.address
    expect(address2).toBe(signerSvm.publicKey.toString().toLowerCase())
  });

	
	test('Should create and get a post', async () => {
		
		// create a post
		await actorBackendEvm.create_post('hello', '')

		// get user last post
		const addressSigner =await signerEvm.getAddress()
		const userPosts = await actorBackendEvm.get_posts_by_user({Evm: { address: addressSigner.toLowerCase()}})
		const userLastPost = userPosts.Ok[userPosts.Ok.length - 1]
		expect(userLastPost.title).toBe('hello')
		expect(userLastPost.address.Evm.address).toBe(addressSigner.toLowerCase())

	})

})
