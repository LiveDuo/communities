
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
    const agent = new HttpAgent({ host: 'http://localhost:8000', identity })
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
    text: IDL.Text,
    timestamp: IDL.Nat64,
    address: IDL.Principal,
  });
  const Post = IDL.Record({
    title: IDL.Text,
    description: IDL.Text,
    timestamp: IDL.Nat64,
    replies: IDL.Vec(Reply),
  });

  const authentication = IDL.Variant({
    Ic: IDL.Record({ principal: IDL.Principal }),
    Evm: IDL.Record({ address: IDL.Text }),
    Svm: IDL.Record({ address: IDL.Text }),
  });

  
  const Profile = IDL.Record({
    name: IDL.Text,
    description: IDL.Text,
    authentication: authentication,
  });
  
  const PostSummary = IDL.Record({
    title: IDL.Text,
    description: IDL.Text,
    address: IDL.Text,
    timestamp: IDL.Nat64,
    replies_count: IDL.Nat64,
    last_activity: IDL.Nat64,
  });

  
  const authenticationWith = IDL.Variant({
    Evm: IDL.Record({ message: IDL.Text, signature:  IDL.Text,}),
    Svm: IDL.Record({ public_key: IDL.Text, signature: IDL.Text, message: IDL.Text }),
    Ic: IDL.Null,
  });

  return IDL.Service({
    create_profile: IDL.Func([authenticationWith],[IDL.Variant({ Ok: Profile, Err: IDL.Text })],["update"]),
    create_post: IDL.Func([IDL.Text, IDL.Text],[IDL.Variant({ Ok: Post, Err: IDL.Text })],["update"]),
    create_reply: IDL.Func([IDL.Nat64, IDL.Text],[IDL.Variant({ Ok: Reply, Err: IDL.Text })],["update"]),
    get_posts: IDL.Func([], [IDL.Vec(PostSummary)], ["query"]),
    get_profile: IDL.Func([],[IDL.Variant({ Ok: Profile, Err: IDL.Text })],["query"]),
    get_post: IDL.Func([IDL.Nat64],[IDL.Variant({ Ok: Post, Err: IDL.Text })],["query"]),
    get_posts_by_user: IDL.Func([authentication], [Profile], ["query"]),
  });
};


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
