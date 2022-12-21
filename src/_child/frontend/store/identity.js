import { createContext, useState, useEffect, useCallback } from 'react'
import { useEthers } from '@usedapp/core'
import { useToast } from '@chakra-ui/react'
import { utils } from 'ethers'

import { createProfileActor } from '../agents/profile'
import { createWallActor } from '../agents/wall'

import { getLoginMessage, getIdentityFromSignature } from '../utils/identity'
import { saveIdentity, loadIdentity, clearIdentity } from '../utils/identity'

const IdentityContext = createContext()

const IdentityProvider = ({children}) => {

  const { account, library } = useEthers()
  const [principal, setPrincipal] = useState()

  const [profileActor, setProfileActor] = useState()
  const [wallActor, setWallActor] = useState()

  const toast = useToast()

  const getOwnPrincipal = useCallback(async (_profileActor) => {
    
    const principal = await _profileActor.get_own_principal()
    if (!principal?.isAnonymous()) {
      setPrincipal(principal)
    }
  }, [])

  useEffect(() => {
    const identity = loadIdentity(account)
    const _profileActor = createProfileActor(identity)
    setProfileActor(_profileActor)
    const _wallActor = createWallActor(identity)
    setWallActor(_wallActor)

    if (account) {
      getOwnPrincipal(_profileActor)
    }
  }, [account, getOwnPrincipal])

  const loginWithMetamask = async () => {
    try {
      // get identity
      const loginMessage = getLoginMessage(account)
      const signature = await library.getSigner().signMessage(loginMessage) // sign with metamask
      const identity = getIdentityFromSignature(signature) // generate Ed25519 identity

      // save identity
      saveIdentity(account, identity) // to local storage
      setPrincipal(identity.getPrincipal())

      // set actors
      const _profileActor = createProfileActor(identity)
      setProfileActor(_profileActor)
      const _wallActor = createWallActor(identity)
      setWallActor(_wallActor)

      // link address
      const profile = await _profileActor.link_address(utils.hashMessage(loginMessage), signature)

      toast({ title: 'Signed in with Ethereum', status: 'success', duration: 4000, isClosable: true })
      return profile
    } catch (error) {
      toast({ title: error.message, status: 'error', duration: 4000, isClosable: true })
    }
	}

  const logout = () => clearIdentity(account)
  const login = () => loginWithMetamask()
  const value = { principal, profileActor, wallActor, login, logout }
  
  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  )
}
export { IdentityContext, IdentityProvider }
