const fs = require('fs/promises')
const { Actor } = require('@dfinity/agent')

const { getCanisters, getAgent } = require('../_meta/shared/utils')
const { getFiles, uploadFile } = require('../_meta/shared/assets')
const { getIdentity } = require('../_meta/shared/identity')
const { assetFactory } = require('../_meta/shared/idl')

; (async () => {

	const canisters = await getCanisters()
	const identity = await getIdentity('default')
	const agent = getAgent('http://localhost:8000', identity)
	const actor = Actor.createActor(assetFactory, { agent, canisterId: canisters.child.local })

	// upload assets
	const assetsChild = await getFiles('./build/child')
	for (let asset of assetsChild) {
		const assetBuf = await fs.readFile(`build/child/${asset}`)
		await uploadFile(actor, `/${asset}`, assetBuf)
	}

})()
