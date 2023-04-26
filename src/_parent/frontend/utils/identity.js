import { Ed25519KeyIdentity } from '@dfinity/identity'

const loadIdentity = (account) => {
  try {
    const keyString = localStorage.getItem(`account_${account}`)
    return Ed25519KeyIdentity.fromJSON(keyString)
  } catch (err) {
    return null
  }
}
export { loadIdentity }

const saveIdentity = (account, identity) => {
  localStorage.setItem(`account_${account}`, JSON.stringify(identity.toJSON()))
}
export { saveIdentity }

const clearIdentity = async (account) => {
  localStorage.removeItem(`account_${account}`)
  window.location = '/'
}
export { clearIdentity }
