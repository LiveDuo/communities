import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'

import { IdentityProvider } from './store/identity'
import { ParentProvider } from './store/parent'
import { LedgerProvider } from './store/ledger'

import Layout from './components/layout'

import Home from './pages/Home'
import Landing from './pages/Landing'

const App = () => (
  <StrictMode>
    <ChakraProvider>
      <IdentityProvider>
        <LedgerProvider>
          <ParentProvider>
            <BrowserRouter>
                <Routes>
                  <Route exact path="/app" element={<Layout><Home /></Layout>}/>
                  <Route exact path="/" element={<Landing/>}/>
                </Routes>
            </BrowserRouter>
          </ParentProvider>
        </LedgerProvider>
      </IdentityProvider>
    </ChakraProvider>
  </StrictMode>
)

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<App/>)
