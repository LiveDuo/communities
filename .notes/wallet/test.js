
const { Actor } = require('@dfinity/agent')

const { getAgent } = require('../../src/_meta/shared/utils')
const { getIdentity } = require('../../src/_meta/shared/identity')
const { parentFactory } = require('../../src/_meta/shared/idl')

const host = 'https://ic0.app'

// node .notes/wallet/test.js
; (async () => {

	const identity = await getIdentity('default')
	const agent = getAgent(host, identity)
	const actor = Actor.createActor(parentFactory, { agent, canisterId: 'y3ouo-yaaaa-aaaap-qbafa-cai' })

	const upgrades = await actor.get_upgrades()
	console.log(upgrades)

})()
