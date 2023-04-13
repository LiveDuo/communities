const { Actor } = require('@dfinity/agent')
const { Ed25519KeyIdentity } = require('@dfinity/identity')
const { Principal } = require("@dfinity/principal")
const { ethers } = require('ethers')
const web3 = require('@solana/web3.js')
const bs58 = require('bs58')

const { setupTests, checkDfxRunning, getAgent, getCanisters } = require('../src/_meta/shared/utils')
const { getEthereumIdentity, getSignatureAndMessage, getSolanaIdentity, getSignatureAndMessageSvm } = require('../src/_meta/shared/identity')
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

	test.only('Should sign in with ethereum', async () => {

		// link address
		const signerAddress = await signerEvm.getAddress()
		const {signature, loginMessageHash} = await getSignatureAndMessage(signerEvm, identityEvm.getPrincipal())
		const profile = await actorBackendEvm.create_profile({Evm: { signature,  message: loginMessageHash }})
		const address =  profile.Ok.authentication.Evm.address
		const principal = Principal.fromUint8Array(profile.Ok.active_principal._arr).toString()
		expect(address).toBe(signerAddress)
		expect(identityEvm.getPrincipal().toString()).toBe(principal)
		console.log(principal)

		// try with some principal
		const profile1 = await actorBackendEvm.create_profile({Evm: { signature,  message: loginMessageHash }})
		expect(profile1.Err).toBe('This principal exist' )

		// logout and login
		identityEvm = Ed25519KeyIdentity.generate()
		const agentEvm = getAgent('http://localhost:8000', identityEvm)
		actorBackendEvm = Actor.createActor(childFactory, { agent: agentEvm, canisterId: canisters.child.local })
		const {signature: signature1 , loginMessageHash: loginMessageHash1} = await getSignatureAndMessage(signerEvm, identityEvm.getPrincipal())
		const profile2 = await actorBackendEvm.create_profile({Evm: { signature : signature1,  message: loginMessageHash1 }})
		const address2 =  profile2.Ok.authentication.Evm.address
		const principal2 = Principal.fromUint8Array(profile2.Ok.active_principal._arr).toString()
		expect(address2).toBe(signerAddress)
		expect(identityEvm.getPrincipal().toString()).toBe(principal2)
		console.log(principal2)

		// get profile by principal
		const profile3 = await actorBackendEvm.get_profile()
		const address3 =  profile3.Ok.authentication.Evm.address
		const principal3 = Principal.fromUint8Array(profile3.Ok.active_principal._arr).toString()
		expect(identityEvm.getPrincipal().toString()).toBe(principal3)
		expect(principal2).toBe(principal3)
		expect(address3).toBe(signerAddress)
		
	})
	test("Should sign in with solana", async () => {
		const {loginMessageHash, signature} = getSignatureAndMessageSvm(signerSvm)
    const pubKey = Buffer.from(bs58.decode(signerSvm.publicKey.toString())).toString("hex");

    // link address
    const profile = await actorBackendSvm.create_profile({Svm: { public_key: pubKey, signature, message: loginMessageHash }});

    const address = profile.Ok.authentication.Svm.address;
    expect(address).toBe(signerSvm.publicKey.toString());

    // check profile and principal
    const profile2 = await actorBackendSvm.get_profile()
    const address2 =  profile2.Ok.authentication.Svm.address
    expect(address2).toBe(signerSvm.publicKey.toString())
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
