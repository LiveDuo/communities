const { Actor, HttpAgent } = require('@dfinity/agent')
const { Principal } = require('@dfinity/principal')
const { Ed25519KeyIdentity } = require('@dfinity/identity')
const { exec, spawn } = require('child_process')
const util = require('util')
const path = require('path')
const { ethers } = require('ethers')

const execP = util.promisify(exec)

global.fetch = require('node-fetch')

jest.setTimeout(20000)
console.log = () => { }

const SHOULD_REDEPLOY = false

const getIdentity = (signature) => {
	const hash = ethers.utils.keccak256(signature)
	if (hash === null) {
		throw new Error(
			'No account is provided. Please provide an account to this application.'
		)
	}

	// converts the hash to an array of 32 integers
	const array = hash
		.replace('0x', '')
		.match(/.{2}/g)
		.map((hexNoPrefix) => ethers.BigNumber.from('0x' + hexNoPrefix).toNumber())

	if (array.length !== 32) {
		throw new Error(
			'Hash of signature is not the correct size! Something went wrong!'
		)
	}
	const uint8Array = Uint8Array.from(array)
	const identity = Ed25519KeyIdentity.generate(uint8Array)

	return identity
}

const getLoginMessage = (account, secret) => {
	return (
		'SIGN THIS MESSAGE TO LOGIN TO THE INTERNET COMPUTER.\n\n' +
		`APP NAME:\nic-wall\n\n` +
		`ADDRESS:\n${account}\n\n` +
		`HASH SECRET:\n${ethers.utils.hashMessage(secret)}`
	)
}

const getSignatureAndMessage = async (signer) => {
	const signerAddress = await signer.getAddress()
	const loginMessage = getLoginMessage(signerAddress, 'MUCH SECRET!')
	const signature = await signer.signMessage(loginMessage)
	const loginMessageHash = ethers.utils.hashMessage(loginMessage)
	return {signature, loginMessageHash}
}

const idlParentFactory = ({ IDL }) => {
	return IDL.Service({
    	'createFrontendCanister' : IDL.Func([], [IDL.Variant({ 'Ok' : IDL.Principal, 'Err' : IDL.Text })], []),
	})
}

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
		'getOwnPrincipal': IDL.Func([], [IDL.Principal], ['query']),
		'getOwnProfile': IDL.Func([], [Profile], ['query']),
		'getPrincipalByEth': IDL.Func(
			[IDL.Text],
			[IDL.Opt(IDL.Principal)],
			['query'],
		),
		'getProfileByEth': IDL.Func([IDL.Text], [IDL.Opt(Profile)], ['query']),
		'getProfileByName': IDL.Func([IDL.Text], [IDL.Opt(Profile)], ['query']),
		'getProfileByPrincipal': IDL.Func(
			[IDL.Principal],
			[IDL.Opt(Profile)],
			['query'],
		),
		'linkAddress': IDL.Func([IDL.Text, IDL.Text], [Profile], []),
		'list': IDL.Func([], [IDL.Vec(Profile)], ['query']),
		'search': IDL.Func([IDL.Text], [IDL.Opt(Profile)], ['query']),
		'setDescription': IDL.Func([IDL.Text], [Profile], []),
		'setName': IDL.Func([IDL.Text], [Profile], []),
		'wall' : IDL.Func([IDL.Text, IDL.Int], [IDL.Vec(Post)], ['query']),
    	'write' : IDL.Func([IDL.Text], [], []),
	})
}

describe('Testing with done', () => {

	let actorBackend, signer

	beforeAll(async () => {

		// check dfx running
		const { stdout } = await execP(`lsof -i:8000`).catch((e) => { if (e.killed) throw e; return e })
		if (stdout.split('\n') < 3)
			throw new Error('DFX is not started')

		let canisterIds = {}
		try {
			const canisters = require(path.resolve('.dfx', 'local', 'canister_ids.json'))
			canisterIds.parent = Principal.fromText(canisters['parent'].local)
		} catch (error) {
			// dfx deploy parent
			throw new Error('Canister not found')
		}

		// re-deploy canisters
		if (SHOULD_REDEPLOY) {
			const stop = spawn('dfx', ['canister', 'stop', '--all'])
			await new Promise((r) => stop.stdout.on('close', r))

			const remove = spawn('dfx', ['canister', 'delete', '--all'])
			await new Promise((r) => remove.stdout.on('close', r))

			const deploy = spawn('dfx', ['deploy'])
			await new Promise((r) => deploy.stdout.on('close', r))
		}

		// get signer
		signer = ethers.Wallet.createRandom()
		const {signature} = await getSignatureAndMessage(signer)

		// get agent
		agent = new HttpAgent({ host: 'http://localhost:8000', identity: getIdentity(signature) })
		agent.fetchRootKey()

		// create parent actor
		const actorParent = Actor.createActor(idlParentFactory, { agent, canisterId: canisterIds['parent'] })
		
		// create backend actor
		const childPrincipalid = await actorParent.createFrontendCanister().then(p => p.Ok.toString())
		actorBackend = Actor.createActor(idlBackendFactory, { agent, canisterId: childPrincipalid })

	})

	test('Should sign in with ethereum', async () => {

		// link address
		const signerAddress = await signer.getAddress()
		const {signature, loginMessageHash} = await getSignatureAndMessage(signer)
		const profile = await actorBackend.linkAddress(loginMessageHash, signature)
		expect(profile.address).toBe(signerAddress.toLowerCase())
		
		// check profile and principal
		const profile2 = await actorBackend.getOwnProfile()
		expect(profile2.address).toBe(signerAddress.toLowerCase())
		const principal2 = await actorBackend.getOwnPrincipal()
		const [profile3] = await actorBackend.getProfileByPrincipal(principal2)
		expect(profile3.address).toBe(signerAddress.toLowerCase())

		// set username
		await actorBackend.setName('name')
		const [profile4] = await actorBackend.getProfileByName('name')
		expect(profile4.address).toBe(signerAddress.toLowerCase())
		await actorBackend.setName('')
				
		// check other profiles
		const [principal] = await actorBackend.getPrincipalByEth(signerAddress.toLowerCase())
		const [profile5] = await actorBackend.getProfileByPrincipal(principal)
		expect(profile5.address).toBe(signerAddress.toLowerCase())

		const [profile6] = await actorBackend.getProfileByEth(signerAddress.toLowerCase())
		expect(profile6.address).toBe(signerAddress.toLowerCase())
		
	})
	
	test('Should write on the wall', async () => {
		
		// write
		await actorBackend.write('hello')
		
		// check general wall
		const principal = await actorBackend.getOwnPrincipal()
		const posts = await actorBackend.wall('', 0)
		const lastPost = posts[posts.length - 1]
		expect(lastPost.id).toBe(BigInt(posts.length))
		expect(lastPost.text).toBe('hello')
		expect(lastPost.principal_id).toBe(principal.toString())
		
		// check user wall
		const userPosts = await actorBackend.wall(principal.toString(), 0)
		const userLastPost = userPosts[userPosts.length - 1]
		expect(userLastPost.text).toBe('hello')
		expect(userLastPost.principal_id).toBe(principal.toString())

	})

})
