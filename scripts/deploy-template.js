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
	'upload_wasm': IDL.Func([IDL.Vec(IDL.Nat8)], [], []),
	'create_wasm_batch': IDL.Func([], [], []),
	'append_wasm_chunk': IDL.Func([IDL.Vec(IDL.Nat8)], [], []),
	'commit_wasm_batch': IDL.Func([], [], []),
})
const actor = Actor.createActor(idlFactory, { agent, canisterId })

; (async () => {
	const wasm = await fs.readFile('./canisters/backend.wasm')

	const chunks = []
	for (let i = 0; i < wasm.byteLength / SIZE_CHUNK; i++) {
		const startIndex = i * SIZE_CHUNK
		chunks.push(wasm.subarray(startIndex, startIndex + SIZE_CHUNK))
	}

	try {
		console.log('Creating wasm batch...')
		await actor.create_wasm_batch()

		console.log('Appending wasm chunk(s)...')
		for (let i = 0; i < chunks.length; i++) {
			await actor.append_wasm_chunk(Array.from(chunks[i]))
		}

		console.log('Commiting wasm batch...')
		await actor.commit_wasm_batch()

	} catch (e) {
		console.error('error', e)
	}
})()

// dfx canister call parent createChildCanister '()' 
// https://github.com/ORIGYN-SA/large_canister_deployer_internal/blob/master/chunker_appender/index.js