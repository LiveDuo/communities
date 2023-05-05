import { Ed25519KeyIdentity } from '@dfinity/identity'

const loadAccount = () => {
  const keyString = localStorage.getItem(`account`)
  if (keyString) {
    const data = JSON.parse(keyString)
    return { account: data.account, ...(data.identity && { identity: Ed25519KeyIdentity.fromParsedJson(data.identity) }) }
  } else  {
    return null
  }
}
export { loadAccount }

const saveAccount = (identity, account) => {
  const data = {account: account, ...(identity && { identity: identity.toJSON() })}
  localStorage.setItem('account', JSON.stringify(data))
}
export { saveAccount }

const clearAccount = async () => {
  localStorage.removeItem('account')
  window.location = '/'
}
export { clearAccount }
