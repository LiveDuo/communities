const fs = require('fs/promises')
const path = require('path')

global.fetch = require('node-fetch')

const MAX_MESSAGE_SIZE = 2097152 - 20000 // 2mb max message size - 20kb padding
exports.MAX_MESSAGE_SIZE = MAX_MESSAGE_SIZE

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

const uploadFile = async (actor, key, assetBuffer) => {
	await actor.store({key, content_type: getContentType(key), content_encoding: 'identity', content: Array.from(assetBuffer)})
	console.log(key)
}
exports.uploadFile = uploadFile

const addItemToBatches= (batches, item, key) => {
	let isStoredAlready = false
	for (const batch of batches) {
		if(batch.batchSize + item.length <= MAX_MESSAGE_SIZE) {
			const storeAsset = { StoreAsset: {key, content_type: getContentType(key), content_encoding: 'identity', content: Array.from(item), sha256: []}}
			batch.items.push(storeAsset)
			isStoredAlready = true
			batch.batchSize = batch.batchSize + item.length
			break
		}
	}
	if(!isStoredAlready) {
		const storeAsset = {StoreAsset:{key, content_type: getContentType(key), content_encoding: 'identity', content: Array.from(item), sha256: []}}
		batches.push({batchSize: item.length, items: [storeAsset]})
	}
}

exports.addItemToBatches = addItemToBatches

const executeStoreBatch = async (actorAsset, batches) => {
	for (const [index, batch] of batches.entries()) {
		await actorAsset.execute_batch(batch.items)
		console.log("executed batch", index + 1)
	}
}

exports.executeStoreBatch = executeStoreBatch


const getChunks = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));


const executeChunkedUpload = async (actorAsset, chunked) => {
	for (const asset of chunked) {
		const batchId = await actorAsset.create_batch().then(res => res.batch_id)

		const chunkIds = []
		const chunks = getChunks(asset.content, MAX_MESSAGE_SIZE)
		for (const chunk of chunks) {
			const chunkId = await actorAsset.create_chunk({ content: chunk, batch_id : batchId }).then(res => res.chunk_id)
			chunkIds.push(chunkId)
		}

		const operations = [
			{ CreateAsset: { key : asset.key, content_type : getContentType(asset.key), headers : [], max_age: [] } },
			{ SetAssetContent: { key: asset.key, content_encoding: 'identity', chunk_ids: chunkIds, sha256: []} }
		]
		await actorAsset.commit_batch({batch_id: batchId, operations: operations})
	}
}
exports.executeChunkedUpload = executeChunkedUpload


