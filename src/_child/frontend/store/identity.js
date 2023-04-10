import { createContext, useState, useEffect, useCallback } from 'react'
import { useToast } from '@chakra-ui/react'
import { utils , ethers} from 'ethers'
import bs58 from 'bs58'

import { createChildActor } from '../agents/child'

import { getLoginMessage, getIdentityFromSignature } from '../utils/identity'
import { saveIdentity, loadIdentity, clearIdentity } from '../utils/identity'

const IdentityContext = createContext()

const IdentityProvider = ({children}) => {
  const [account, setAccount] = useState()
  const [principal, setPrincipal] = useState()

  const [childActor, setChildActor] = useState()

  const toast = useToast()

  const getAccountForEvm = useCallback(async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      setAccount(address)
  }, [])

  const getAccountForSvm = useCallback(async () => {
    const phantom = window.solana
    await phantom.connect()
    const address = phantom.publicKey.toString()
    setAccount(address)
  }, [])
  
  
  useEffect(() => {
    const identity = loadIdentity(account)
    const _childActor = createChildActor(identity)
    setChildActor(_childActor)

    if (account) {
      setPrincipal(identity?.getPrincipal())
    }
  }, [account])

  const loginWithEvm = async () => {
    try {
      // get identity
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const loginMessage = getLoginMessage(address, 'evm')
      const signature = await signer.signMessage(loginMessage)// sign with metamask
      const identity = getIdentityFromSignature(signature) // generate Ed25519 identity
      
      // save identity
      saveIdentity(identity, 'evm') // to local storage
      setPrincipal(identity?.getPrincipal())

      // set actors
      const _childActor = createChildActor(identity)
      setChildActor(_childActor)

      // link address
      let profile = await _childActor.create_profile({Evm: { message: utils.hashMessage(loginMessage), signature} })

      if(profile.Ok) {
        profile = profile.Ok
      } else {
        profile = await _childActor.get_profile().then(res => res.Ok)
      }

      setAccount(address)
      
      toast({ title: 'Signed in with Ethereum', status: 'success', duration: 4000, isClosable: true })

      return profile
    } catch (error) {
      toast({ title: error.message, status: 'error', duration: 4000, isClosable: true })
    }
	}
  const loginWithSvm = async () => {
    try {

      const phantom = window.solana
      await phantom.connect()
      const address = phantom.publicKey.toString()
      const loginMessage = getLoginMessage(address, 'svm')
      
      // get identity
      const encodedMessage = new TextEncoder().encode(loginMessage)
      const signedMessage = await phantom.request({ method: 'signMessage', params: { message: encodedMessage } })
      const publicKeyBytes = bs58.decode(signedMessage.publicKey)
      const signatureBytes = bs58.decode(signedMessage.signature)
      const identity = getIdentityFromSignature(Buffer.from(signedMessage.signature)) // generate Ed25519 identity
      
      // set actors
      const _childActor = createChildActor(identity)
      setChildActor(_childActor)

      // save identity
      saveIdentity(identity, 'svm') // to local storage
      setPrincipal(identity?.getPrincipal())

      // link address
      let profile = await _childActor.create_profile({Svm: { public_key: Buffer.from(publicKeyBytes).toString('hex'), signature: Buffer.from(signatureBytes).toString('hex'), message: Buffer.from(encodedMessage).toString('hex') }});

      if(profile.Ok) {
        profile = profile.Ok
      } else {
        profile = await _childActor.get_profile().then(res => res.Ok)
      }

      setAccount(address)
      
      toast({ title: 'Signed in with Solana', status: 'success', duration: 4000, isClosable: true })

      return profile
    } catch (error) {
      toast({ title: error.message, status: 'error', duration: 4000, isClosable: true })
    }
	}

  const logout = () => clearIdentity(account)

  const login = async (type) => {
    if(type === 'evm') {
      return await loginWithEvm()
    } else if(type === 'svm') {
      return await loginWithSvm()
    }
  }
  const value = { account, principal, childActor, login, logout, setAccount }
  
  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  )
}
export { IdentityContext, IdentityProvider }
