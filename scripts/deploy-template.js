const fs = require('fs/promises')

const { Actor, HttpAgent } = require('@dfinity/agent')

global.fetch = require('node-fetch')

const agent = new HttpAgent({ host: 'http://localhost:8000' })

if (process.env.NODE_ENV !== 'production') {
	agent.fetchRootKey().catch(err => {
		console.warn('Unable to fetch root key. Check to ensure that your local replica is running')
		console.error(err)
	})
}

const canisterId = 'rrkah-fqaaa-aaaaa-aaaaq-cai'
const SIZE_CHUNK = 1024000 // one megabyte

const idlFactory = ({ IDL }) => IDL.Service({
	'create_batch': IDL.Func([IDL.Text], [], []),
	'append_chunk': IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [], []),
	'commit_batch': IDL.Func([IDL.Text], [], []),
	'store_batch': IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [], []),
})
const actor = Actor.createActor(idlFactory, { agent, canisterId })

const uploadFile = async (key, assetBuffer) => {
	const chunksNumber = Math.ceil(assetBuffer.byteLength / SIZE_CHUNK)

	if (chunksNumber === 1) {
		console.log(`Storing ${key} batch...`)
		await actor.store_batch(key, Array.from(assetBuffer))
	} else {
		const chunks = []

		for (let i = 0; i < assetBuffer.byteLength / SIZE_CHUNK; i++) {
			const startIndex = i * SIZE_CHUNK
			chunks.push(assetBuffer.subarray(startIndex, startIndex + SIZE_CHUNK))
		}
		
		try {
			console.log(`Creating ${key} batch...`)
			await actor.create_batch(key)
	
			console.log(`Appending ${key} chunk(s)...`)
			for (let i = 0; i < chunks.length; i++) {
				await actor.append_chunk(key, Array.from(chunks[i]))
			}
	
			console.log(`Commiting ${key} batch...`)
			await actor.commit_batch(key)
	
		} catch (e) {
			console.error('error', e)
		}
	}
}
; (async () => {
	const wasm = await fs.readFile('./canisters/backend.wasm')
	await uploadFile('wasm', wasm)
	
	const asset = await fs.readFile('./build/index.html')
	await uploadFile('index.html', asset)
})()

// dfx canister call parent createChildCanister '()' 
// https://github.com/ORIGYN-SA/large_canister_deployer_internal/blob/master/chunker_appender/index.js


// TODO
// 1. need frontend build script
// 2. add upload frontend assets (for forum)
	// -> create_assets_batch, append_assets_chunk, commit_assets_batch

// EXTRA
// - include prepare-wasm.sh

