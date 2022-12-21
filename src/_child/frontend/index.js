import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import { DAppProvider } from '@usedapp/core'

import { IdentityProvider } from './store/identity'
import { ProfileProvider } from './store/profile'
import { PostsProvider } from './store/posts'

import Layout from './components/layout'

import UserPosts from './pages/UserPosts'
import Posts from './pages/Posts'

const config = {}

const App = () => (
  <StrictMode>
    <ChakraProvider>
      <DAppProvider config={config}>
        <IdentityProvider>
          <ProfileProvider>
            <PostsProvider>
              <BrowserRouter>
                  <Routes>
                    <Route exact path="/" element={<Layout><Posts /></Layout>}/>
                    <Route path="/user/:address" element={<Layout><UserPosts /></Layout>}/>
                  </Routes>
              </BrowserRouter>
            </PostsProvider>
          </ProfileProvider>
        </IdentityProvider>
      </DAppProvider>
    </ChakraProvider>
  </StrictMode>
)

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<App/>)
