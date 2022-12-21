import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import { DAppProvider } from '@usedapp/core'

import { IdentityProvider } from './store/identity'
import { ProfileProvider } from './store/profile'
import { WallProvider } from './store/wall'

import Layout from './components/layout'

import UserWall from './pages/UserWall'
import Wall from './pages/Wall'

const config = {}

const App = () => (
  <StrictMode>
    <ChakraProvider>
      <DAppProvider config={config}>
        <IdentityProvider>
          <ProfileProvider>
            <WallProvider>
              <BrowserRouter>
                  <Routes>
                    <Route exact path="/" element={<Layout><Wall /></Layout>}/>
                    <Route path="/user/:address" element={<Layout><UserWall /></Layout>}/>
                  </Routes>
              </BrowserRouter>
            </WallProvider>
          </ProfileProvider>
        </IdentityProvider>
      </DAppProvider>
    </ChakraProvider>
  </StrictMode>
)

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<App/>)
