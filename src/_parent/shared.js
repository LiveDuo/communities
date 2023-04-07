const fs = require('fs/promises')
const path = require('path')
const os = require('os')

const { Ed25519KeyIdentity } = require('@dfinity/identity')
const { HttpAgent } = require('@dfinity/agent')
const pem = require('pem-file')

global.fetch = require('node-fetch')

const getIdentity = async (name) => {
	const pemFile = await fs.readFile(`${os.homedir()}/.config/dfx/identity/${name}/identity.pem`)
	const buffer = pem.decode(pemFile)
	const secretKey = Buffer.concat([buffer.subarray(16, 48), buffer.subarray(53, 85)])
	return Ed25519KeyIdentity.fromSecretKey(secretKey)
}
exports.getIdentity = getIdentity

const getAgent = (host, identity) => {
	const agent = new HttpAgent({ host, identity })
	agent.fetchRootKey().catch(err => {
		console.warn('Unable to fetch root key. Check to ensure that your local replica is running')
		console.error(err)
	})
	return agent
}
exports.getAgent = getAgent

const getCanisters = async () => {
	try {
			return require(path.resolve('.dfx', 'local', 'canister_ids.json'))
	} catch (error) {
			throw new Error('Canister not found') // should deploy first
	}
}
exports.getCanisters = getCanisters

const parentFactory = ({ IDL }) => {
	const StoreArgs = IDL.Record({'key': IDL.Text, 'content_type': IDL.Text, 'content_encoding': IDL.Text, 'content': IDL.Vec(IDL.Nat8)})
	return IDL.Service({
		'create_batch': IDL.Func([IDL.Text], [], []),
		'append_chunk': IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [], []),
		'commit_batch': IDL.Func([IDL.Text], [], []),
		'store_batch': IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [], []),
		'store': IDL.Func([StoreArgs], [], []),
	})
}
exports.parentFactory = parentFactory

const getContentType = (k) => {
	if (k.endsWith('.html')) return 'text/html'
	else if (k.endsWith('.js')) return 'text/javascript'
	else if (k.endsWith('.css')) return 'text/css'
	else if (k.endsWith('.txt')) return 'text/plain'
	else if (k.endsWith('.md')) return 'text/markdown'
	else return 'application/octet-stream'
}
exports.getContentType = getContentType

const getFiles = async (dir, initial) => {
	let fileList = []
	const rootFolder = initial ?? dir
	const files = await fs.readdir(dir)
	for (const file of files) {
		const currentPath = path.join(dir, file)
		const stat = await fs.stat(currentPath)
		if (stat.isDirectory()) {
			fileList = [...fileList, ...(await getFiles(currentPath, rootFolder))]
		} else {
			fileList.push(path.relative(rootFolder, currentPath))
		}
	}
	return fileList.filter(f => !f.endsWith('.DS_Store'))
}
exports.getFiles = getFiles

const SIZE_CHUNK = 1024000 // one megabyte

// https://github.com/ORIGYN-SA/large_canister_deployer_internal/blob/master/chunker_appender/index.js
const uploadFileBatch = async (actor, key, assetBuffer) => {
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

			console.log(`Committing ${key} batch...`)
			await actor.commit_batch(key)

		} catch (e) {
			console.error('error', e)
		}
	}
}
exports.uploadFileBatch = uploadFileBatch

const uploadFile = async (actor, key, assetBuffer) => {
	await actor.store({key, content_type: getContentType(key), content_encoding: 'identity', content: Array.from(assetBuffer)})
	console.log(key)
}
exports.uploadFile = uploadFile
