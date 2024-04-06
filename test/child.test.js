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

		// get random identity for evm
		signerEvm = ethers.Wallet.createRandom()
		identityEvm = Ed25519KeyIdentity.generate()
		
		// get random identity for svm
		signerSvm = web3.Keypair.generate()
		identitySvm = Ed25519KeyIdentity.generate()
		
		// get random identity for ic
		identityIc = Ed25519KeyIdentity.generate()
		
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
		const userPosts = await actorBackendEvm.get_posts_by_auth({Evm: { address: signerAddress}})
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
		const userPosts2 = await actorBackendEvm.get_posts_by_auth({Evm: { address: signerAddress}})
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
		const userPosts = await actorBackendSvm.get_posts_by_auth({Svm: { address: signerSvm.publicKey.toString()}})
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
		const userPosts2 = await actorBackendSvm.get_posts_by_auth({Svm: { address: signerSvm.publicKey.toString()}})
		expect(userPosts2.Ok.length).toBe(2)
  	});
	test("Should sign in with internet computer", async () => {
		// link address
		const profile = await actorBackendIc.create_profile({Ic: null})
		const principal = profile.Ok.active_principal
		expect(principal.toString()).toBe(identityIc.getPrincipal().toString())

		await actorBackendIc.create_post('hello', '')
		const userPosts = await actorBackendIc.get_posts_by_auth({Ic: {principal: principal}})
		expect(userPosts.Ok.length).toBe(1)


		// logout and login
		const profile1 = await actorBackendIc.create_profile({Ic: null});
		const principal1 = profile1.Ok.active_principal
    	expect(principal1.toString()).toBe(identityIc.getPrincipal().toString())

		await actorBackendIc.create_post('hello', '')
		const userPosts2 = await actorBackendIc.get_posts_by_auth({Ic: {principal: principal1}})
		expect(userPosts2.Ok.length).toBe(2)
  	});

	test('Should create and get a post', async () => {
		
		// create a post
		const createdPost = await actorBackendIc.create_post('hello', '')
		const postId = createdPost.Ok.post_id

		// create a reply
		await actorBackendIc.create_reply(postId, 'hello')

		// get user last post
		const principal = identityIc.getPrincipal()
		const userPosts = await actorBackendIc.get_posts_by_auth({Ic: { principal: principal}})
		const userLastPost = userPosts.Ok.sort((a, b) => Number(b.timestamp / 1000n / 1000n) -  Number(a.timestamp / 1000n / 1000n)).at(0)

		expect(userLastPost.title).toBe('hello')
		expect(userLastPost.replies_count).toBe(1n)
		expect(userLastPost.authentication.Ic.principal.toString()).toBe(principal.toString())
	})

	test('Should create posts and get the most like posts', async () => {
		// create 10 profiles
		const actors = []
		for (let _ of Array(10)) {
			const identity = Ed25519KeyIdentity.generate()
			const agentIc = getAgent('http://127.0.0.1:8000', identity)
			const actor = Actor.createActor(childFactory, { agent: agentIc, canisterId: canisters.child.local })
			await actor.create_profile({Ic: null})
			actors.push(actor)
			
		}

		// profile does not have posts
		const principal = identityIc.getPrincipal()
		const mostLikedPosts = await actorBackendIc.get_most_liked_posts({Ic: { principal: principal}})
		expect(mostLikedPosts.Ok.length).toBe(0)

		// create 10 posts and one like of each use
		let postIds = []
		for (let index = 0; index <= 9; index++) {
			const createdPost = await actorBackendIc.create_post('hello', '')
			const postId = createdPost.Ok.post_id
			await actors[index].like_post(postId)
			postIds.push(createdPost.Ok.post_id)
			
		}
		const mostLikedPosts1 = await actorBackendIc.get_most_liked_posts({Ic: { principal: principal}})
		expect(postIds.every((postId, index)=> mostLikedPosts1.Ok[index].post_id === postId)).toBe(true)

		// like "most liked post"
		await actors[2].like_post(postIds[9])
		postIds = [postIds[9], postIds[0], ...postIds.slice(1, 8)]
		const mostLikedPosts2 = await actorBackendIc.get_most_liked_posts({Ic: { principal: principal}})
		expect(postIds.every((postId, index)=> mostLikedPosts2.Ok[index].post_id === postId)).toBe(true)
		
		// like not "most liked post"
		const createdPost = await actorBackendIc.create_post('hello', '')
		const postId = createdPost.Ok.post_id
		await actors[2].like_post(postId)
		const mostLikedPosts3 = await actorBackendIc.get_most_liked_posts({Ic: { principal: principal}})
		expect(mostLikedPosts3.Ok.includes((post)=> post.post_id !== postId)).toBe(false)
		
		// like not "most liked post" to "most liked post"
		await actors[3].like_post(postId)
		const mostLikedPosts4 = await actorBackendIc.get_most_liked_posts({Ic: { principal: principal}})
		postIds = [postIds[0], postId, ...postIds.slice(1, 8)]
		expect(postIds.every((postId, index)=> mostLikedPosts4.Ok[index].post_id === postId)).toBe(true)
	})

	test('Should create replies and get the most like replies', async () => {
		// create 10 profiles
		const actors = []
		for (let _ of Array(10)) {
			const identity = Ed25519KeyIdentity.generate()
			const agentIc = getAgent('http://127.0.0.1:8000', identity)
			const actor = Actor.createActor(childFactory, { agent: agentIc, canisterId: canisters.child.local })
			await actor.create_profile({Ic: null})
			actors.push(actor)
			
		}

		// profile does not have posts
		const principal = identityIc.getPrincipal()
		const mostLikedReplies = await actorBackendIc.get_most_liked_replies({Ic: { principal: principal}})
		expect(mostLikedReplies.Ok.length).toBe(0)

		// create 10 replies and one like of each use
		const createdPost = await actorBackendIc.create_post('hello', '')
		const postId = createdPost.Ok.post_id
		let replyIds = []
		for (let index = 0; index <= 9; index++) {
			const createdReply = await actorBackendIc.create_reply(postId, 'hello')
			const replyId = createdReply.Ok.reply_id
			await actors[index].like_reply(replyId)
			replyIds.push(replyId)
			
		}
		const mostLikedReplies1 = await actorBackendIc.get_most_liked_replies({Ic: { principal: principal}})
		expect(replyIds.every((replyId, index)=> mostLikedReplies1.Ok[index].reply_id === replyId)).toBe(true)

		// like "most liked reply"
		await actors[2].like_reply(replyIds[9])
		replyIds = [replyIds[9], replyIds[0], ...replyIds.slice(1, 8)]
		const mostLikedReplies2 = await actorBackendIc.get_most_liked_replies({Ic: { principal: principal}})
		expect(replyIds.every((replyId, index)=> mostLikedReplies2.Ok[index].reply_id === replyId)).toBe(true)
		
		// like not "most liked reply"
		const createdReply = await actorBackendIc.create_reply(postId, 'hello')
		const replyId = createdReply.Ok.reply_id
		await actors[2].like_reply(replyId)
		const mostLikedReplies3 = await actorBackendIc.get_most_liked_replies({Ic: { principal: principal}})
		expect(mostLikedReplies3.Ok.includes((reply)=> reply.reply_id !== replyId)).toBe(false)
		
		// like not "most liked reply" to "most liked reply"
		await actors[3].like_reply(replyId)
		const mostLikedReplies4 = await actorBackendIc.get_most_liked_replies({Ic: { principal: principal}})
		replyIds = [replyIds[0], replyId, ...replyIds.slice(1, 8)]
		expect(replyIds.every((replyId, index)=> mostLikedReplies4.Ok[index].reply_id === replyId)).toBe(true)
	})

	test.skip('Should create, hide and restore a post', async () => {
		const principal = identityIc.getPrincipal()

		// create a post
		const createdPost = await actorBackendIc.create_post('hello', '')
		const postId = createdPost.Ok.post_id

		const posts = await actorBackendIc.get_posts()
		const userPosts = await actorBackendIc.get_posts_by_auth({Ic: { principal: principal}})
		const post = await actorBackendIc.get_post(postId)
		expect(posts.some(post => post.post_id === postId)).toBe(true)
		expect(userPosts.Ok.some(post => post.post_id === postId)).toBe(true)
		expect(post.Ok).toBeDefined()

		// hide a post 
		await actorBackendIc.update_post_status(postId, {Hidden: null})

		const posts1 = await actorBackendIc.get_posts()
		const userPosts1 = await actorBackendIc.get_posts_by_auth({Ic: { principal: principal}})
		const post1 = await actorBackendIc.get_post(postId)
		expect(posts1.some(post => post.post_id === postId)).toBe(false)
		expect(userPosts1.Ok.some(post => post.post_id === postId)).toBe(false)
		expect(post1.Err).toBe("This post is hiden")
		
		// restore a post
		await actorBackendIc.update_post_status(postId, {Visible: null})

		const posts2 = await actorBackendIc.get_posts()
		const post2 = await actorBackendIc.get_post(postId)
		const userPosts2 = await actorBackendIc.get_posts_by_auth({Ic: { principal: principal}})
		expect(userPosts2.Ok.some(post => post.post_id === postId)).toBe(true)
		expect(posts2.some(post => post.post_id === postId)).toBe(true)
		expect(post2.Ok).toBeDefined()
	})

	test.skip('Should create, hide, and restore a reply', async () => {
		const principal = identityIc.getPrincipal()

		// create a post
		const createdPost = await actorBackendIc.create_post('hello', '')
		const postId = createdPost.Ok.post_id
		// create a reply 
		const createdReply = await actorBackendIc.create_reply(postId, 'hello')
		const replyId = createdReply.Ok.reply_id

		const posts = await actorBackendIc.get_posts()
		const userPosts = await actorBackendIc.get_posts_by_auth({Ic: { principal: principal}})
		const post = await actorBackendIc.get_post(postId)
		expect(posts.find(p => p.post_id === postId).replies_count).toBe(1n)
		expect(userPosts.Ok.find(p => p.post_id === postId).replies_count).toBe(1n)
		expect(post.Ok.replies.some(r => r.reply_id === replyId)).toBe(true)
		
		// hide a reply
		await actorBackendIc.update_reply_status(replyId, {Hidden: null})

		const posts1 = await actorBackendIc.get_posts()
		const userPosts1 = await actorBackendIc.get_posts_by_auth({Ic: { principal: principal}})
		const post1 = await actorBackendIc.get_post(postId)
		expect(posts1.find(p => p.post_id === postId).replies_count).toBe(0n)
		expect(userPosts1.Ok.find(p => p.post_id === postId).replies_count).toBe(0n)
		expect(post1.Ok.replies.some(r => r.reply_id === replyId)).toBe(false)
		
		// restore a reply
		await actorBackendIc.update_reply_status(replyId, {Visible: null})

		const posts2 = await actorBackendIc.get_posts()
		const userPosts2 = await actorBackendIc.get_posts_by_auth({Ic: { principal: principal}})
		const post2 = await actorBackendIc.get_post(postId)
		expect(posts2.find(p => p.post_id === postId).replies_count).toBe(1n)
		expect(userPosts2.Ok.find(p => p.post_id === postId).replies_count).toBe(1n)
		expect(post2.Ok.replies.some(r => r.reply_id === replyId)).toBe(true)
	})
	test.skip('Should get hidden posts', async () => {
		// create a post
		const createdPost = await actorBackendIc.create_post('hello', '')
		const postId = createdPost.Ok.post_id

		const hiddenPosts = await actorBackendIc.get_hidden_posts()
		expect(hiddenPosts.Ok.find(p => p.post_id === postId)).toBeUndefined()

		// hide a post
		await actorBackendIc.update_post_status(postId, {Hidden: null})

		const hiddenPosts1 = await actorBackendIc.get_hidden_posts()
		expect(hiddenPosts1.Ok.find(p => p.post_id === postId)).toBeDefined()
	})
	test.skip('Should get hidden replies', async () => {
		// create a post
		const createdPost = await actorBackendIc.create_post('hello', '')
		const postId = createdPost.Ok.post_id

		// create a reply
		const createdReply = await actorBackendIc.create_reply(postId, 'hello')
		const replyId = createdReply.Ok.reply_id

		const hiddenReplies = await actorBackendIc.get_hidden_replies()
		expect(hiddenReplies.Ok.find(p => p[1].reply_id === replyId)).toBeUndefined()
		
		// hide a reply
		await actorBackendIc.update_reply_status(replyId, {Hidden: null})
		
		const hiddenReplies1 = await actorBackendIc.get_hidden_replies()
		expect(hiddenReplies1.Ok.find(p => p[1].reply_id === replyId)).toBeDefined()
	})
	test('Should create, like and unlike post', async () => {
		// create a post
		const createdPost = await actorBackendIc.create_post('hello', '')
		const postId = createdPost.Ok.post_id

		// like a post
		const likedPost = await actorBackendIc.like_post(postId)
		expect(likedPost.Ok).toBeDefined()

		const post = await actorBackendIc.get_post(postId)
		expect(post.Ok.likes.length).toBe(1)

		// unlike a post
		const [ likedPostId ] = post.Ok.likes[0]
		const unlikePost = await actorBackendIc.unlike_post(likedPostId)
		expect(unlikePost.Ok).toBeDefined()

		const post1 = await actorBackendIc.get_post(postId)
		expect(post1.Ok.likes.length).toBe(0)
	})
	test('Should create, like and unlike reply', async () => {
		// create a post and a reply
		const createdPost = await actorBackendIc.create_post('hello', '')
		const postId = createdPost.Ok.post_id
		const createRely = await actorBackendIc.create_reply(postId, 'hello')
		const replyId = createRely.Ok.reply_id

		// like a reply
		const likedReply = await actorBackendIc.like_reply(replyId)
		expect(likedReply.Ok).toBeDefined()

		const post = await actorBackendIc.get_post(postId)
		expect(post.Ok.replies[0].likes.length).toBe(1)

		// unlike a reply
		const [ likedReplyId ] = post.Ok.replies[0].likes[0]
		const unlikeReply = await actorBackendIc.unlike_reply(likedReplyId)
		expect(unlikeReply.Ok).toBeDefined()

		const post1 = await actorBackendIc.get_post(postId)
		expect(post1.Ok.replies[0].likes.length).toBe(0)
	})
})
