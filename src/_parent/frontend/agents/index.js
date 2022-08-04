import { HttpAgent } from '@dfinity/agent'

const isDev = process.env.REACT_APP_ICP_ENV === 'development'

const icHost = isDev ? '127.0.0.1:8000' : 'ic0.app'
export { icHost }

const icUrl = isDev ? `http://${icHost}/` : `https://${icHost}`
export { icUrl }

const getAgent = (identity) => {
  const agent = new HttpAgent({ host: icHost, identity })

  // Fetch root key for certificate validation during development
  if (process.env.REACT_APP_ICP_ENV !== 'production') {
    agent.fetchRootKey().catch((err) => {
      console.warn('Unable to fetch root key. Check to ensure that your local replica is running')
      console.error(err)
    })
  }
  return agent
}
export { getAgent }
