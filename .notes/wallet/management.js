
const { Actor } = require('@dfinity/agent')
const { Principal } = require('@dfinity/principal')

const { getAgent } = require('../../src/_meta/shared/utils')
const { getIdentity } = require('../../src/_meta/shared/identity')
const { managementFactory } = require('../../src/_meta/shared/idl')

const host = 'https://ic0.app'

// node .notes/wallet/management.js
; (async () => {

	const identity = await getIdentity('default')
	const agent = getAgent(host, identity)
	const actor = Actor.createActor(managementFactory, { agent, canisterId: 'aaaaa-aa' })

	const canisterId = Principal.fromText('y3ouo-yaaaa-aaaap-qbafa-cai')
	const res = await actor.canister_status({canister_id: canisterId })
	console.log(res)

})()
