import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'

import { IdentityProvider } from './store/identity'
import { ParentProvider } from './store/parent'
import { LedgerProvider } from './store/ledger'
import { CmcProvider } from './store/cmc'

import App from './pages/App'
import Landing from './pages/Landing'
import Upgrades from './pages/Upgrades'

const Index = () => (
  <StrictMode>
    <ChakraProvider>
      <IdentityProvider>
        <LedgerProvider>
          <CmcProvider>
            <ParentProvider>
              <BrowserRouter>
                  <Routes>
                    <Route exact path="/upgrades" element={<Upgrades />}/>
                    <Route exact path="/app" element={<App />}/>
                    <Route exact path="/" element={<Landing/>}/>
                  </Routes>
              </BrowserRouter>
            </ParentProvider>
          </CmcProvider>
        </LedgerProvider>
      </IdentityProvider>
    </ChakraProvider>
  </StrictMode>
)

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<Index/>)
