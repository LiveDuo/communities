import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'

import { IdentityProvider } from './store/identity'
import { ChildProvider } from './store/child'

import Layout from './components/layout'

import Profile from './pages/Profile'
import Post from './pages/Post'
import Home from './pages/Home'
import Admin from './pages/Admin'

const App = () => (
  <StrictMode>
    <ChakraProvider>
      <IdentityProvider>
          <ChildProvider>
            <BrowserRouter>
                <Routes>
                  <Route exact path="/" element={<Layout><Home /></Layout>}/>
                  <Route path="/user/:type/:address" element={<Layout><Profile /></Layout>}/>
                  <Route path="/post/:index" element={<Layout><Post /></Layout>}/>
                  <Route path="/admin" element={<Layout><Admin /></Layout>}/>
                </Routes>
            </BrowserRouter>
          </ChildProvider>
      </IdentityProvider>
    </ChakraProvider>
  </StrictMode>
)

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<App/>)
