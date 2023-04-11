import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import { DAppProvider } from '@usedapp/core'

import { IdentityProvider } from './store/identity'
import { ChildProvider } from './store/child'

import Layout from './components/layout'

import UserPosts from './pages/UserPosts'
import Post from './pages/Post'
import Posts from './pages/Posts'

const config = {}

const App = () => (
  <StrictMode>
    <ChakraProvider>
      <DAppProvider config={config}>
        <IdentityProvider>
          <ChildProvider>
            <BrowserRouter>
                <Routes>
                  <Route exact path="/" element={<Layout><Posts /></Layout>}/>
                  <Route path="/user/:address/:type" element={<Layout><UserPosts /></Layout>}/>
                  <Route path="/post/:index" element={<Layout><Post /></Layout>}/>
                </Routes>
            </BrowserRouter>
          </ChildProvider>
        </IdentityProvider>
      </DAppProvider>
    </ChakraProvider>
  </StrictMode>
)

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<App/>)
