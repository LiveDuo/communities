
const { Actor, HttpAgent } = require('@dfinity/agent')
const { Principal } = require('@dfinity/principal')
const { exec } = require('child_process')
const util = require('util')
const path = require('path')
const { ethers } = require('ethers')

const {getIdentityFromSignature, getSignatureAndMessage, getRandomIdentity} = require('./identity')

const execP = util.promisify(exec)

const checkDfxRunning = async () => {
    const { stdout } = await execP(`lsof -i:8080`).catch((e) => { if (e.killed) throw e; return e })
    if (stdout.split('\n') < 3)
        throw new Error('DFX is not started')
}
exports.checkDfxRunning = checkDfxRunning

const transferIcpToAccount = async (accountId) => {
	const command = `dfx ledger transfer --ledger-canister-id $(dfx canister id ledger) --amount 1 --memo 1347768404 ${accountId}`
    const { stdout } = await execP(command).catch((e) => { if (e.killed) throw e; return e })
	if (!stdout.startsWith('Transfer sent at'))
        throw new Error('Transfer failed')
}
exports.transferIcpToAccount = transferIcpToAccount

const getCanisters = async () => {
    try {
				return require(path.resolve('.dfx', 'local', 'canister_ids.json'))
    } catch (error) {
        throw new Error('Canister not found') // should deploy first
    }
}
exports.getCanisters = getCanisters

const setupTests = () => {
    global.fetch = require('node-fetch')

    jest.setTimeout(20000)
    // console.log = () => { }
}
exports.setupTests = setupTests

const idlParentFactory = ({ IDL }) => {
	return IDL.Service({
    	'create_child' : IDL.Func([], [IDL.Variant({ 'Ok' : IDL.Principal, 'Err' : IDL.Text })], []),
	})
}

const getAgent = async (identity) => {
    const agent = new HttpAgent({ host: 'http://localhost:8080', identity })
    agent.fetchRootKey()
    return agent
}
exports.getAgent = getAgent

const getParentActor = async (agent) => {

    // get canister ids
    const canisters = await getCanisters()

		const parentCanisterID = Principal.fromText(canisters['parent'].local)

    // create parent actor
    const actorParent = Actor.createActor(idlParentFactory, { agent, canisterId: parentCanisterID })
    return actorParent
}
exports.getParentActor = getParentActor

const idlBackendFactory = ({ IDL }) => {
	const Reply = IDL.Record({
		'text': IDL.Text,
		'timestamp': IDL.Nat64,
		'address': IDL.Principal
	  })
	  const Post = IDL.Record({
		'title' : IDL.Text,
		'description' : IDL.Text,
		'address': IDL.Text,
		'timestamp': IDL.Nat64,
		'replies': IDL.Vec(Reply),
	  })
	const Profile = IDL.Record({
		'name': IDL.Text,
		'description': IDL.Text,
		'address': IDL.Text,
	})
	const PostSummary = IDL.Record({
		'title' : IDL.Text,
		'description' : IDL.Text,
		'address': IDL.Text,
		'timestamp': IDL.Nat64,
		'replies_count': IDL.Nat64,
		'last_activity': IDL.Nat64,
	  })
	return IDL.Service({
		'get_profile': IDL.Func([], [Profile], ['query']),
		'get_profile_by_address': IDL.Func([IDL.Text], [IDL.Opt(Profile)], ['query']),
		'update_profile_address': IDL.Func([IDL.Text, IDL.Text], [Profile], []),
		'update_profile': IDL.Func([IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)], [Profile], []),
		'get_post': IDL.Func([IDL.Nat64], [Post], ['query']),
		'get_posts' : IDL.Func([], [IDL.Vec(PostSummary)], ['query']),
    	'create_post' : IDL.Func([IDL.Text, IDL.Text], [], []),
		'create_reply': IDL.Func([IDL.Nat64, IDL.Text], [], ['update']),
	})
}

const getChildActor = async (agent, childPrincipalid) => {
    const actorChild = Actor.createActor(idlBackendFactory, { agent, canisterId: childPrincipalid })
    return actorChild
}
exports.getChildActor = getChildActor

const getEthereumIdentity = async () => {
    const signerRandom = ethers.Wallet.createRandom()
	const {signature} = await getSignatureAndMessage(signerRandom)
	const identity = getIdentityFromSignature(signature)
    return {identity, signerRandom}
}
exports.getEthereumIdentity = getEthereumIdentity

exports.getRandomIdentity = getRandomIdentity

exports.getSignatureAndMessage = getSignatureAndMessage
