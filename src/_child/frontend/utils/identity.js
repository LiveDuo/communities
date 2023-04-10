import { utils, BigNumber } from 'ethers'
import { Ed25519KeyIdentity } from '@dfinity/identity'

const loginSecret = 'MUCH SECRET!'

const getLoginMessage = (account, type) => {
  if (type === 'evm') {
    return (
      'SIGN THIS MESSAGE TO LOGIN TO THE INTERNET COMPUTER.\n\n' +
      `APP NAME:\nic-communities\n\n` +
      `ADDRESS:\n${account}\n\n` +
      `HASH SECRET:\n${utils.hashMessage(loginSecret)}`
    )
  } else if (type === 'svm') {
    return (
      'SIGN THIS MESSAGE TO LOGIN TO THE INTERNET COMPUTER.\n\n' +
      `APP NAME:\nic-communities\n\n` +
      `ADDRESS:\n${account}\n\n`
    )
  }
}
export { getLoginMessage }

const getIdentityFromSignature = (signature) => {
  // get hash from signature
  const hash = utils.keccak256(signature)
  if (hash === null)
    throw new Error('No Ethereum account is provided.')

  // convert to an array of 32 integers
  const array = hash
    .replace('0x', '')
    .match(/.{2}/g)
    .map((hexNoPrefix) => BigNumber.from(`0x${hexNoPrefix}`).toNumber())
  if (array.length !== 32)
    throw new Error('Invalid signature hash.')

  // generate identity
  const uint8Array = Uint8Array.from(array)
  return Ed25519KeyIdentity.generate(uint8Array)
}
export { getIdentityFromSignature }

const loadIdentity = () => {
  try {
    const keyString = localStorage.getItem(`identity`)
    return Ed25519KeyIdentity.fromJSON(keyString)
  } catch (err) {
    return null
  }
}
export { loadIdentity }

const saveIdentity = (identity, type) => {
  localStorage.setItem('identity', JSON.stringify(identity.toJSON()))
}
export { saveIdentity }

const clearIdentity = async (account) => {
  localStorage.removeItem('identity')
  window.location = '/'
}
export { clearIdentity }

const loadAccount = () => {
  const keyString = localStorage.getItem(`account`)
  return JSON.parse(keyString)
}
export { loadAccount }

const saveAccount = (account) => {
  localStorage.setItem('account', JSON.stringify(account))
}
export { saveAccount }

const clearAccount = async () => {
  localStorage.removeItem('account')
  window.location = '/'
}

export { clearAccount }
