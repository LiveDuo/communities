const minimist = require('minimist')
const { Actor } = require('@dfinity/agent')
const { Ed25519KeyIdentity } = require('@dfinity/identity')
const { getCanisters, getAgent, getHost } = require('../_meta/shared/utils')
const { getIdentity } = require('../_meta/shared/identity')
const { childFactory } = require('../_meta/shared/idl')

const argv = minimist(process.argv.slice(2))
const network = argv.network ?? 'local'
const id = argv.identity ?? 'default'
const count = argv.count ?? 5
; (async () => {

	const canisters = await getCanisters(network)
	const identity = await getIdentity(id)
	const agent = getAgent(getHost(network), identity)
	const mainActor = Actor.createActor(childFactory, { agent, canisterId: canisters.child[network] })
	await mainActor.create_profile({Ic: null})

	// create profiles
	const actors = []
	const promisesProfile = []
	for (let _ of Array(count)) {
		const identity = Ed25519KeyIdentity.generate()
		const agentIc = getAgent('http://127.0.0.1:8000', identity)
		const actor = Actor.createActor(childFactory, { agent: agentIc, canisterId: canisters.child.local })
		const promise = actor.create_profile({Ic: null})
		promisesProfile.push(promise)
		actors.push(actor)
	}

	await Promise.all(promisesProfile)

	// create and like one post for each profile
	const promisesPosts = []
	for (const actor of actors) {
		const promise = mainActor.create_post('hello', '').then(res => actor.like_post(res.Ok.post_id))
		promisesPosts.push(promise)
	}
	await Promise.all(promisesPosts)

	// create and like one reply for each profile
	const createdPost = await mainActor.create_post('hello', '')
	const postId = createdPost.Ok.post_id
	const promisesReplies = []
	for (const actor of actors) {
		const promise = mainActor.create_reply(postId, 'hello').then(res =>  actor.like_reply(res.Ok.reply_id))
		promisesReplies.push(promise)
	}

	await Promise.all(promisesReplies)
})()
