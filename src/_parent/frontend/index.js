import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import { Mainnet, DAppProvider } from '@usedapp/core'
import { getDefaultProvider } from 'ethers'

import { IdentityProvider } from './store/identity'
import { ParentProvider } from './store/parent'
import { LedgerProvider } from './store/ledger'

import Layout from './components/layout'

import Home from './pages/Home'

const config = {
  readOnlyChainId: Mainnet.chainId,
  readOnlyUrls: { [Mainnet.chainId]: getDefaultProvider('mainnet') }
}

const App = () => (
  <StrictMode>
    <ChakraProvider>
      <DAppProvider config={config}>
        <IdentityProvider>
          <LedgerProvider>
            <ParentProvider>
              <BrowserRouter>
                  <Routes>
                    <Route exact path="/" element={<Layout><Home /></Layout>}/>
                  </Routes>
              </BrowserRouter>
            </ParentProvider>
          </LedgerProvider>
        </IdentityProvider>
      </DAppProvider>
    </ChakraProvider>
  </StrictMode>
)

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<App/>)