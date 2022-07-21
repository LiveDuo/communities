import { HttpAgent } from '@dfinity/agent'

const isDev = process.env.NODE_ENV === 'development'
const icHost = isDev ? 'http://127.0.0.1:8000/' : 'https://ic0.app'
export { icHost }

const getAgent = (identity) => {
  const agent = new HttpAgent({ host: icHost, identity })

  // Fetch root key for certificate validation during development
  if (process.env.NODE_ENV !== 'production') {
    agent.fetchRootKey().catch((err) => {
      console.warn('Unable to fetch root key. Check to ensure that your local replica is running')
      console.error(err)
    })
  }
  return agent
}
export { getAgent }