const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')
const { Ed25519KeyIdentity } = require('@dfinity/identity')
const { getCanisters, getAgent, getHost } = require('../_meta/shared/utils')
const { getIdentity } = require('../_meta/shared/identity')
const { childFactory } = require('../_meta/shared/idl')

const argv = minimist(process.argv.slice(2))
const network = argv.network ?? 'local'
const id = argv.identity ?? 'default'
const counts = argv.counts ?? 5
; (async () => {

	const canisters = await getCanisters(network)
	const identity = await getIdentity(id)
	const agent = getAgent(getHost(network), identity)
	const mainActor = Actor.createActor(childFactory, { agent, canisterId: canisters.child[network] })
	await mainActor.create_profile({Ic: null})
	// create 10 profiles
	const actors = []
	for (let _ of Array(counts)) {
		const identity = Ed25519KeyIdentity.generate()
		const agentIc = getAgent('http://127.0.0.1:8000', identity)
		const actor = Actor.createActor(childFactory, { agent: agentIc, canisterId: canisters.child.local })
		await actor.create_profile({Ic: null})
		actors.push(actor)
	}

	// create 10 posts and one like of each use
	for (let index = 0; index < counts; index++) {
		const createdPost = await mainActor.create_post('hello', '')
		const postId = createdPost.Ok.post_id
		await actors[index].like_post(postId)
	}

	// create 10 replies and one like of each use
	const createdPost = await mainActor.create_post('hello', '')
	const postId = createdPost.Ok.post_id
	let replyIds = []
	for (let index = 0; index < counts; index++) {
		const createdReply = await mainActor.create_reply(postId, 'hello')
		const replyId = createdReply.Ok.reply_id
		await actors[index].like_reply(replyId)
		replyIds.push(replyId)
	}

})()
