
const { Actor, HttpAgent } = require('@dfinity/agent')
const { Principal } = require('@dfinity/principal')
const { exec } = require('child_process')
const util = require('util')
const path = require('path')
const { ethers } = require('ethers')

const {getIdentityFromSignature, getSignatureAndMessage, getRandomIdentity} = require('./identity')

const execP = util.promisify(exec)

const checkDfxRunning = async () => {
    const { stdout } = await execP(`lsof -i:8000`).catch((e) => { if (e.killed) throw e; return e })
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

const getCanisterIds = async () => {
    let canisterIds = {}
    try {
        const canisters = require(path.resolve('.dfx', 'local', 'canister_ids.json'))
        canisterIds.parent = Principal.fromText(canisters['parent'].local)
    } catch (error) {
        throw new Error('Canister not found') // should deploy first
    }
    return canisterIds
}
exports.getCanisterIds = getCanisterIds

const setupTests = () => {
    global.fetch = require('node-fetch')

    jest.setTimeout(20000)
    // console.log = () => { }
}
exports.setupTests = setupTests

const idlParentFactory = ({ IDL }) => {
	return IDL.Service({
		'caller_account_id': IDL.Func([], [IDL.Text], ['query']),
    	'create_child_canister' : IDL.Func([], [IDL.Variant({ 'Ok' : IDL.Principal, 'Err' : IDL.Text })], []),
	})
}

const getAgent = async (identity) => {
    const agent = new HttpAgent({ host: 'http://localhost:8000', identity })
    agent.fetchRootKey()
    return agent
}
exports.getAgent = getAgent

const getParentActor = async (agent) => {

    // get canister ids
    const canisterIds = await getCanisterIds()

    // create parent actor
    const actorParent = Actor.createActor(idlParentFactory, { agent, canisterId: canisterIds['parent'] })
    return actorParent
}
exports.getParentActor = getParentActor

const idlBackendFactory = ({ IDL }) => {
	const Profile = IDL.Record({
		'name': IDL.Text,
		'description': IDL.Text,
		'address': IDL.Text,
	})
	const Post = IDL.Record({
		'id' : IDL.Int,
		'text' : IDL.Text,
		'principal_id' : IDL.Text,
		'user_address' : IDL.Text,
		'user_name' : IDL.Text,
		'timestamp' : IDL.Int,
	  })
	return IDL.Service({
		'get_own_principal': IDL.Func([], [IDL.Principal], ['query']),
		'get_own_profile': IDL.Func([], [Profile], ['query']),
		'get_principal_by_eth': IDL.Func(
			[IDL.Text],
			[IDL.Opt(IDL.Principal)],
			['query'],
		),
		'get_profile_by_eth': IDL.Func([IDL.Text], [IDL.Opt(Profile)], ['query']),
		'get_profile_by_principal': IDL.Func(
			[IDL.Principal],
			[IDL.Opt(Profile)],
			['query'],
		),
		'link_address': IDL.Func([IDL.Text, IDL.Text], [Profile], []),
		'set_description': IDL.Func([IDL.Text], [Profile], []),
		'set_name': IDL.Func([IDL.Text], [Profile], []),
		'get_posts' : IDL.Func([IDL.Text, IDL.Int], [IDL.Vec(Post)], ['query']),
    	'create_post' : IDL.Func([IDL.Text], [], []),
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
