
const { Actor } = require('@dfinity/agent')
const { Principal } = require('@dfinity/principal')

const { getAgent } = require('../../src/_meta/shared/utils')
const { getIdentity } = require('../../src/_meta/shared/identity')
const { managementFactory } = require('../../src/_meta/shared/idl')

const host = 'https://ic0.app'
const MANAGEMENT_CANISTER_ID = Principal.fromText('aaaaa-aa');

// https://forum.dfinity.org/t/how-to-make-ic-management-api-canister-status-call-with-dfinity-agent/7139/2
// node .notes/wallet/management.js
;(async () => {

	const identity = await getIdentity('default')
	const agent = getAgent(host, identity)
	const canisterId = Principal.fromText('y3ouo-yaaaa-aaaap-qbafa-cai')

	const actor = Actor.createActor(managementFactory, { agent, canisterId: MANAGEMENT_CANISTER_ID, effectiveCanisterId: canisterId })
	
	const res2 = await actor.canister_status({canister_id: canisterId })
	console.log(res2)
})()
