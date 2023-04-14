import { Ed25519KeyIdentity } from '@dfinity/identity'

const getLoginMessage = (account) => {
  return (
    'Sign this message to login.\n\n' +
    `App:\ncommunities.ooo\n\n` +
    `Address:\n${account}\n\n`
  )
}
export { getLoginMessage }

const getIdentityFromSignature = () => {
  return Ed25519KeyIdentity.generate()
}
export { getIdentityFromSignature }

const loadIdentity = () => {
  const keyString = localStorage.getItem(`identity`)
  if (keyString) {
    const data = JSON.parse(keyString)
    return { identity: Ed25519KeyIdentity.fromParsedJson(data.identity), account: data.account}
  } else  {
    return null
  }
}
export { loadIdentity }

const saveIdentity = (identity, account) => {
  const data = {identity: identity.toJSON(), account}
  localStorage.setItem('identity', JSON.stringify(data))
}
export { saveIdentity }

const clearIdentity = async () => {
  localStorage.removeItem('identity')
  window.location = '/'
}
export { clearIdentity }
