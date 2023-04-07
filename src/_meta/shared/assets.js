const fs = require('fs/promises')
const path = require('path')

global.fetch = require('node-fetch')

const SIZE_CHUNK = 1024000 // one megabyte

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
