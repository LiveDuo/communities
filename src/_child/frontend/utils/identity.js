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


