const fs = require('fs/promises')
const { Actor } = require('@dfinity/agent')

const { getCanisters, getIdentity, getFiles, getAgent, uploadFile, assetFactory } = require('../_meta/shared')

; (async () => {

	const canisters = await getCanisters()
	const identity = getIdentity('default')
	const agent = getAgent('http://localhost:8000', identity)
	const actor = Actor.createActor(assetFactory, { agent, canisterId: canisters.child.local })

	// upload assets
	const assetsChild = await getFiles('./build/child')
	for (let asset of assetsChild) {
		const assetBuf = await fs.readFile(`build/child/${asset}`)
		await uploadFile(actor, `/${asset}`, assetBuf)
	}

})()
