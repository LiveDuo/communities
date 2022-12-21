const { Ed25519KeyIdentity } = require('@dfinity/identity')
const { ethers } = require('ethers')

const getRandomIdentity = () => {
	const uint8Array = Uint8Array.from(Array.from({length: 32}, () => 0))
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

const getLoginMessage = (account, secret) => {
	return (
		'SIGN THIS MESSAGE TO LOGIN TO THE INTERNET COMPUTER.\n\n' +
		`APP NAME:\nic-communities\n\n` +
		`ADDRESS:\n${account}\n\n` +
		`HASH SECRET:\n${ethers.utils.hashMessage(secret)}`
	)
}
exports.getLoginMessage = getLoginMessage

const getSignatureAndMessage = async (signer) => {
	const signerAddress = await signer.getAddress()
	const loginMessage = getLoginMessage(signerAddress, 'MUCH SECRET!')
	const signature = await signer.signMessage(loginMessage)
	const loginMessageHash = ethers.utils.hashMessage(loginMessage)
	return {signature, loginMessageHash}
}
exports.getSignatureAndMessage = getSignatureAndMessage
