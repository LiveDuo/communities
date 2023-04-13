const { Ed25519KeyIdentity, Ed25519PublicKey } = require('@dfinity/identity')
const readlineSync = require('readline-sync')
const { ethers } = require('ethers')
const tweetnacl = require('tweetnacl')
const argon2 = require('argon2')
const pem = require('pem-file')

const fs = require('fs/promises')
const crypto = require('crypto')
const os = require('os')

const aesDecrypt = (encrypted, iv, key, tag) => {
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
	decipher.setAuthTag(tag)
	return Buffer.concat([decipher.update(encrypted, 'base64'), decipher.final()])
}

const decryptPemFile = async (wallet, password) => {
	// read pem and config
	const pemFile = await fs.readFile(`${os.homedir()}/.config/dfx/identity/${wallet}/identity.pem.encrypted`)
	const configStr = await fs.readFile(`${os.homedir()}/.config/dfx/identity/${wallet}/identity.json`, 'utf8')
	const config = JSON.parse(configStr)

	// calculate hash
	const salt = Buffer.from(config.encryption.pw_salt, 'base64')
	const options = { type: 2, version: 0x13, timeCost: 3, memoryCost: 64000, parallelism: 1, hashLength: 32, salt, saltLength: 64 }
	const keyFull = await argon2.hash(password, options)
	const keySplit = keyFull.split('$')
	const key = Buffer.from(keySplit[5], 'base64')

	// decrypt pem file
	const nonce = Buffer.from(config.encryption.file_nonce)
	const tag = pemFile.subarray(pemFile.byteLength - 16, pemFile.byteLength)
	const msg = pemFile.subarray(0, pemFile.byteLength - 16)
	const decrypted = aesDecrypt(msg, nonce, key, tag)
	const decryptedFirst = decrypted.toString().replaceAt(27, '\n')
	const decryptedAfter = decryptedFirst.replaceAt(decryptedFirst.length - 27, '\n')
	return decryptedAfter
}

const getRandomIdentity = () => {
	const uint8Array = Uint8Array.from(Array.from({ length: 32 }, () => 0))
	const identity = Ed25519KeyIdentity.generate(uint8Array)
	return identity
}
exports.getRandomIdentity = getRandomIdentity

const getIdentityFromSignature = (signature) => {
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
exports.getIdentityFromSignature = getIdentityFromSignature

const getLoginMessage = (principal) => {
	return (
		'SIGN THIS MESSAGE TO LOGIN TO THE INTERNET COMPUTER.\n\n' +
		`APP NAME:\nic-communities\n\n` +
		`Principal:\n${principal}`
	)
}
exports.getLoginMessage = getLoginMessage

const getSignatureAndMessage = async (signer, principal) => {
	const loginMessage = getLoginMessage(principal.toString())
	const signature = await signer.signMessage(loginMessage)
	const loginMessageHash = ethers.utils.hashMessage(loginMessage)
	return { signature, loginMessageHash }
}
exports.getSignatureAndMessage = getSignatureAndMessage


const getSignatureAndMessageSvm = (account, principal)=> {
	const loginMessage = getLoginMessage(principal.toString())
	const encodeMsg = new TextEncoder().encode(loginMessage);
	const signature = tweetnacl.sign.detached(encodeMsg, account.secretKey)

	return { signature: Buffer.from(signature).toString('hex'), loginMessageHash:  Buffer.from(encodeMsg.buffer).toString("hex") }
}
exports.getSignatureAndMessageSvm = getSignatureAndMessageSvm


const exists = (s) => fs.access(s).then(() => true).catch(() => false)

String.prototype.replaceAt = function (index, replacement) {
	return this.substring(0, index) + replacement + this.substring(index + replacement.length)
}

const getIdentity = async (name) => {

	const path = `${os.homedir()}/.config/dfx/identity/${name}`

	let pemFile
	if (await exists(`${path}/identity.pem`)) {
		pemFile = await fs.readFile(`${path}/identity.pem`)
	} else {
		const password = readlineSync.question('Enter identity passphrase: ', { hideEchoBack: true, mask: '' })
		pemFile = await decryptPemFile(name, password)
	}

	const buffer = pem.decode(pemFile)
	const secretKey = Buffer.concat([buffer.subarray(16, 48), buffer.subarray(53, 85)])
	return Ed25519KeyIdentity.fromSecretKey(secretKey)
}
exports.getIdentity = getIdentity
