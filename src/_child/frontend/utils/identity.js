import * as ethers from 'ethers'
import { Ed25519KeyIdentity } from '@dfinity/identity'

const loginSecret = 'MUCH SECRET!'

const getLoginMessage = (account, type) => {
  if (type === 'evm') {
    return (
      'Sign this message to login.\n\n' +
      `App Name:\nic-communities\n\n` +
      `Address:\n${account}\n\n` +
      `Hash Secret:\n${ethers.utils.hashMessage(loginSecret)}`
    )
  } else if (type === 'svm') {
    return (
      'Sign this message to login.\n\n' +
      `App Name:\nic-communities\n\n` +
      `Address:\n${account}\n\n`
    )
  }
}
export { getLoginMessage }

const getIdentityFromSignature = (signature) => {
  const hash = ethers.utils.keccak256(signature)
  const buffer = Buffer.from(hash.substring(2), 'hex')
  return Ed25519KeyIdentity.generate(buffer)
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
