import { createContext, useState, useEffect } from 'react'
import { useEthers } from '@usedapp/core'
import { useToast } from '@chakra-ui/react'
import { utils } from 'ethers'

import { createChildActor } from '../agents/child'

import { getLoginMessage, getIdentityFromSignature } from '../utils/identity'
import { saveIdentity, loadIdentity, clearIdentity } from '../utils/identity'

const IdentityContext = createContext()

const IdentityProvider = ({children}) => {

  const { account, library } = useEthers()
  const [principal, setPrincipal] = useState()

  const [childActor, setChildActor] = useState()

  const toast = useToast()

  useEffect(() => {
    const identity = loadIdentity(account)
    const _childActor = createChildActor(identity)
    setChildActor(_childActor)

    if (account) {
      setPrincipal(identity?.getPrincipal())
    }
  }, [account])

  const loginWithMetamask = async () => {
    try {
      // get identity
      const loginMessage = getLoginMessage(account)
      const signature = await library.getSigner().signMessage(loginMessage) // sign with metamask
      const identity = getIdentityFromSignature(signature) // generate Ed25519 identity

      // save identity
      saveIdentity(account, identity) // to local storage
      setPrincipal(identity?.getPrincipal())

      // set actors
      const _childActor = createChildActor(identity)
      setChildActor(_childActor)

      // link address
      let profile = await _childActor.create_profile({Evm: { message: utils.hashMessage(loginMessage), signature} })

      if(profile.Ok) {
        profile = profile.Ok
        toast({ title: 'Signed in with Ethereum', status: 'success', duration: 4000, isClosable: true })
      } else {
        profile = await _childActor.get_profile().then(res => res.Ok)
      }


      return profile
    } catch (error) {
      toast({ title: error.message, status: 'error', duration: 4000, isClosable: true })
    }
	}

  const logout = () => clearIdentity(account)
  const login = () => loginWithMetamask()
  const value = { account, principal, childActor, login, logout }
  
  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  )
}
export { IdentityContext, IdentityProvider }
