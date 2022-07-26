import { createContext, useState, useEffect } from 'react'
import { useEthers } from '@usedapp/core'

import { createParentActor } from '../agents/parent'

import { loadIdentity, clearIdentity } from '../utils/identity'

const IdentityContext = createContext()

const IdentityProvider = ({children}) => {

  const { account } = useEthers()

  const [parentActor, setParentActor] = useState()

  useEffect(() => {
    const identity = loadIdentity(account)
    const _parentActor = createParentActor(identity)
    setParentActor(_parentActor)
  }, [account])

  const logout = () => clearIdentity(account)
  const value = { parentActor, logout }
  
  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  )
}
export { IdentityContext, IdentityProvider }
