const { Actor } = require('@dfinity/agent')
const { Ed25519KeyIdentity } = require('@dfinity/identity')
const { Principal } = require("@dfinity/principal")
const { ethers } = require('ethers')
const web3 = require('@solana/web3.js')
const bs58 = require('bs58')

const { setupTests, checkDfxRunning, getAgent, getCanisters } = require('../src/_meta/shared/utils')
const {  getSignatureAndMessage, getSignatureAndMessageSvm } = require('../src/_meta/shared/identity')
const { childFactory } = require('../src/_meta/shared/idl')

setupTests()

describe('Testing with done', () => {

	let actorBackendEvm, actorBackendSvm, signerEvm, identityEvm, signerSvm, identitySvm, canisters

	beforeAll(async () => {

		// check ic replica
		await checkDfxRunning()

		// get random identity for emv
		signerEvm = ethers.Wallet.createRandom()
		identityEvm = Ed25519KeyIdentity.generate()

		// get random identity for emv
		signerSvm = web3.Keypair.generate()
		identitySvm =Ed25519KeyIdentity.generate()
		
		// create child actor
		canisters = await getCanisters()

		const agentEvm = getAgent('http://localhost:8000', identityEvm)
		actorBackendEvm = Actor.createActor(childFactory, { agent: agentEvm, canisterId: canisters.child.local })

		const agentSvm = getAgent('http://localhost:8000', identitySvm)
		actorBackendSvm = Actor.createActor(childFactory, { agent: agentSvm, canisterId: canisters.child.local })

	})

	test('Should sign in with ethereum', async () => {

		// link address
		const signerAddress = await signerEvm.getAddress()
		const {signature, loginMessageHash} = await getSignatureAndMessage(signerEvm, identityEvm.getPrincipal())
		const profile = await actorBackendEvm.create_profile({Evm: { signature,  message: loginMessageHash }})
		const address =  profile.Ok.authentication.Evm.address
		const principal = Principal.fromUint8Array(profile.Ok.active_principal._arr).toString()
		expect(address).toBe(signerAddress)
		expect(identityEvm.getPrincipal().toString()).toBe(principal)
		
		await actorBackendEvm.create_post('hello', '')
		const userPosts = await actorBackendEvm.get_posts_by_user({Evm: { address: signerAddress}})
		expect(userPosts.Ok.length).toBe(1)

		// logout and login
		identityEvm = Ed25519KeyIdentity.generate()
		const agentEvm = getAgent('http://localhost:8000', identityEvm)
		actorBackendEvm = Actor.createActor(childFactory, { agent: agentEvm, canisterId: canisters.child.local })
		const {signature: signature1 , loginMessageHash: loginMessageHash1} = await getSignatureAndMessage(signerEvm, identityEvm.getPrincipal())
		const profile1 = await actorBackendEvm.create_profile({Evm: { signature : signature1,  message: loginMessageHash1 }})
		const address1 =  profile1.Ok.authentication.Evm.address
		const principal1 = Principal.fromUint8Array(profile1.Ok.active_principal._arr).toString()
		expect(address1).toBe(signerAddress)
		expect(identityEvm.getPrincipal().toString()).toBe(principal1)

		await actorBackendEvm.create_post('hello', '')
		const userPosts1 = await actorBackendEvm.get_posts_by_user({Evm: { address: signerAddress}})
		expect(userPosts1.Ok.length).toBe(2)
		
	})
	test("Should sign in with solana", async () => {
		
		// link address
		const {loginMessageHash, signature} = getSignatureAndMessageSvm(signerSvm, identityEvm.getPrincipal())
    const pubKey = Buffer.from(bs58.decode(signerSvm.publicKey.toString())).toString("hex");
    const profile = await actorBackendSvm.create_profile({Svm: { public_key: pubKey, signature, message: loginMessageHash }});
    const address = profile.Ok.authentication.Svm.address;
    expect(address).toBe(signerSvm.publicKey.toString());

		await actorBackendSvm.create_post('hello', '')
		const userPosts = await actorBackendSvm.get_posts_by_user({Svm: { address: signerSvm.publicKey.toString()}})
		expect(userPosts.Ok.length).toBe(1)

		// logout and login
		identitySvm = Ed25519KeyIdentity.generate()
		const agentSvm = getAgent('http://localhost:8000', identitySvm)
		actorBackendSvm = Actor.createActor(childFactory, { agent: agentSvm, canisterId: canisters.child.local })
		const {loginMessageHash: loginMessageHash1, signature: signature1} = getSignatureAndMessageSvm(signerSvm, identityEvm.getPrincipal())
		const profile1 = await actorBackendSvm.create_profile({Svm: { public_key: pubKey, signature: signature1, message: loginMessageHash1 }});
    const address1 = profile1.Ok.authentication.Svm.address;
    expect(address1).toBe(signerSvm.publicKey.toString());

		await actorBackendSvm.create_post('hello', '')
		const userPosts1 = await actorBackendSvm.get_posts_by_user({Svm: { address: signerSvm.publicKey.toString()}})
		expect(userPosts1.Ok.length).toBe(2)

  });
	test('Should create and get a post', async () => {
		
		// create a post
		await actorBackendEvm.create_post('hello', '')

		// get user last post
		const addressSigner =await signerEvm.getAddress()
		const userPosts = await actorBackendEvm.get_posts_by_user({Evm: { address: addressSigner}})
		const userLastPost = userPosts.Ok[userPosts.Ok.length - 1]
		expect(userLastPost.title).toBe('hello')
		expect(userLastPost.address.Evm.address).toBe(addressSigner)
	})
})
