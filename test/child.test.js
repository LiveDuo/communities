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

	let actorBackendEvm, actorBackendSvm, actorBackendIc, signerEvm, identityEvm, signerSvm, identitySvm, identityIc, canisters

	beforeAll(async () => {

		// check ic replica
		await checkDfxRunning()

		// get random identity for emv
		signerEvm = ethers.Wallet.createRandom()
		identityEvm = Ed25519KeyIdentity.generate()

		// get random identity for emv
		signerSvm = web3.Keypair.generate()
		identitySvm =Ed25519KeyIdentity.generate()

		// get random identity for ic
		identityIc =Ed25519KeyIdentity.generate()
		
		// create child actor
		canisters = await getCanisters('local')

		const agentEvm = getAgent('http://127.0.0.1:8000', identityEvm)
		actorBackendEvm = Actor.createActor(childFactory, { agent: agentEvm, canisterId: canisters.child.local })

		const agentSvm = getAgent('http://127.0.0.1:8000', identitySvm)
		actorBackendSvm = Actor.createActor(childFactory, { agent: agentSvm, canisterId: canisters.child.local })

		const agentIc = getAgent('http://127.0.0.1:8000', identityIc)
		actorBackendIc = Actor.createActor(childFactory, { agent: agentIc, canisterId: canisters.child.local })

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

		identityEvm = Ed25519KeyIdentity.generate()
		const {signature: signature1, loginMessageHash: loginMessageHash1} = await getSignatureAndMessage(signerEvm, identityEvm.getPrincipal())
		const profile1 = await actorBackendEvm.create_profile({Evm: { signature: signature1,  message: loginMessageHash1 }})
		expect(profile1.Err).toBe("Principal does not match")

		// logout and login
		identityEvm = Ed25519KeyIdentity.generate()
		const agentEvm = getAgent('http://127.0.0.1:8000', identityEvm)
		actorBackendEvm = Actor.createActor(childFactory, { agent: agentEvm, canisterId: canisters.child.local })
		const {signature: signature2 , loginMessageHash: loginMessageHash2} = await getSignatureAndMessage(signerEvm, identityEvm.getPrincipal())
		const profile2 = await actorBackendEvm.create_profile({Evm: { signature : signature2,  message: loginMessageHash2 }})
		const address2 =  profile2.Ok.authentication.Evm.address
		const principal2 = Principal.fromUint8Array(profile2.Ok.active_principal._arr).toString()
		expect(address2).toBe(signerAddress)
		expect(identityEvm.getPrincipal().toString()).toBe(principal2)

		await actorBackendEvm.create_post('hello', '')
		const userPosts2 = await actorBackendEvm.get_posts_by_user({Evm: { address: signerAddress}})
		expect(userPosts2.Ok.length).toBe(2)
		
	})
	test("Should sign in with solana", async () => {
		
		// link address
		const {loginMessageHash, signature} = getSignatureAndMessageSvm(signerSvm, identitySvm.getPrincipal())
    const pubKey = Buffer.from(bs58.decode(signerSvm.publicKey.toString())).toString("hex");
    const profile = await actorBackendSvm.create_profile({Svm: { public_key: pubKey, signature, message: loginMessageHash }});
    const address = profile.Ok.authentication.Svm.address;
    expect(address).toBe(signerSvm.publicKey.toString());

		await actorBackendSvm.create_post('hello', '')
		const userPosts = await actorBackendSvm.get_posts_by_user({Svm: { address: signerSvm.publicKey.toString()}})
		expect(userPosts.Ok.length).toBe(1)

		identitySvm = Ed25519KeyIdentity.generate()
		const {loginMessageHash: loginMessageHash1, signature: signature1} = getSignatureAndMessageSvm(signerSvm, identitySvm.getPrincipal())
		const profile1 = await actorBackendSvm.create_profile({Svm: { public_key: pubKey, signature: signature1, message: loginMessageHash1 }});
		expect(profile1.Err).toBe("Principal does not match");

		// logout and login
		identitySvm = Ed25519KeyIdentity.generate()
		const agentSvm = getAgent('http://127.0.0.1:8000', identitySvm)
		actorBackendSvm = Actor.createActor(childFactory, { agent: agentSvm, canisterId: canisters.child.local })
		const {loginMessageHash: loginMessageHash2, signature: signature2} = getSignatureAndMessageSvm(signerSvm, identitySvm.getPrincipal())
		const profile2 = await actorBackendSvm.create_profile({Svm: { public_key: pubKey, signature: signature2, message: loginMessageHash2 }});
    const address2 = profile2.Ok.authentication.Svm.address;
    expect(address2).toBe(signerSvm.publicKey.toString());

		await actorBackendSvm.create_post('hello', '')
		const userPosts2 = await actorBackendSvm.get_posts_by_user({Svm: { address: signerSvm.publicKey.toString()}})
		expect(userPosts2.Ok.length).toBe(2)
  });
	test("Should sign in with internet computer", async () => {
		
		// link address
    const profile = await actorBackendIc.create_profile({Ic: null})
    const principal = profile.Ok.active_principal
    expect(principal.toString()).toBe(identityIc.getPrincipal().toString())

		await actorBackendIc.create_post('hello', '')
		const userPosts = await actorBackendIc.get_posts_by_user({Ic: null})
		expect(userPosts.Ok.length).toBe(1)


		// logout and login
		const profile1 = await actorBackendIc.create_profile({Ic: null});
		const principal1 = profile1.Ok.active_principal
    expect(principal1.toString()).toBe(identityIc.getPrincipal().toString())

		await actorBackendIc.create_post('hello', '')
		const userPosts2 = await actorBackendIc.get_posts_by_user({Ic: null})
		expect(userPosts2.Ok.length).toBe(2)
  });
	test('Should create and get a post', async () => {
		
		// create a post
		const createdPost = await actorBackendEvm.create_post('hello', '')
		const postId = createdPost.Ok.post_id

		// create a reply
		await actorBackendEvm.create_reply(postId, 'hello')

		// get user last post
		const addressSigner = await signerEvm.getAddress()
		const userPosts = await actorBackendEvm.get_posts_by_user({Evm: { address: addressSigner}})
		const userLastPost = userPosts.Ok.sort((a, b) => Number(b.timestamp / 1000n / 1000n) -  Number(a.timestamp / 1000n / 1000n)).at(0)

		expect(userLastPost.title).toBe('hello')
		expect(userLastPost.replies_count).toBe(1n)
		expect(userLastPost.authentication.Evm.address).toBe(addressSigner)
	})
})
