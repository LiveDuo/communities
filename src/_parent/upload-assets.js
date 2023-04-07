const fs = require('fs/promises')
const { Actor } = require('@dfinity/agent')

const { getCanisters, getIdentity, getFiles, getAgent, uploadFile, assetFactory } = require('../_meta/shared')

; (async () => {

	const canisters = await getCanisters()
	const identity = getIdentity('default')
	const agent = getAgent('http://localhost:8000', identity)
	const actor = Actor.createActor(assetFactory, { agent, canisterId: canisters.parent.local })

	// upload wasm
	const wasm = await fs.readFile('./build/canister/child.wasm')
	await uploadFile(actor, '/child/child.wasm', wasm)
	
	// upload domain file
	const domains = await fs.readFile('./build/domains/index.txt')
	await uploadFile(actor, '/.well-known/ic-domains', domains)

	// upload parent assets
	const assetsParent = await getFiles('./build/parent')
	for (let asset of assetsParent) {
		const assetBuf = await fs.readFile(`build/parent/${asset}`)
		await uploadFile(actor, `/${asset}`, assetBuf)
	}

	// upload child assets
	const assetsChild = await getFiles('./build/child')
	for (let asset of assetsChild) {
		const assetBuf = await fs.readFile(`build/child/${asset}`)
		await uploadFile(actor, `/child/${asset}`, assetBuf)
	}

})()
