import { createContext, useState, useEffect } from 'react'
import { useToast } from '@chakra-ui/react'
import { utils , ethers} from 'ethers'
import bs58 from 'bs58'

import { createChildActor } from '../agents/child'

import { getLoginMessage, getIdentityFromSignature } from '../utils/identity'
import { saveIdentity, loadIdentity, clearIdentity } from '../utils/identity'

const IdentityContext = createContext()

const IdentityProvider = ({children}) => {
  const [account, setAccount] = useState()
  const [identity, setIdentity] = useState()

  const [childActor, setChildActor] = useState()

  const toast = useToast()
  
  useEffect(() => {
    const data = loadIdentity()
    const _childActor = createChildActor(data?.identity)
    setChildActor(_childActor)
    setAccount(data?.account)
    setIdentity(data?.identity)
  }, [])

  const loginWithEvm = async () => {
    try {
      // get identity
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const loginMessage = getLoginMessage(address)
      const signature = await signer.signMessage(loginMessage)// sign with metamask
      const identity = getIdentityFromSignature(signature) // generate Ed25519 identity
      
      // save identity
      const account = {address, type: 'Evm'}
      saveIdentity(identity, account)
      setIdentity(identity)
      setAccount(account)

      // set actors
      const _childActor = createChildActor(identity)
      setChildActor(_childActor)

      // link address
      const auth = {Evm: { message: utils.hashMessage(loginMessage), signature} }
      const response = await _childActor.create_profile(auth)
      const profile = response.Ok

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
      const loginMessage = getLoginMessage(address)
      
      // get identity
      const encodedMessage = new TextEncoder().encode(loginMessage)
      const signedMessage = await phantom.request({ method: 'signMessage', params: { message: encodedMessage } })
      const identity = getIdentityFromSignature(Buffer.from(signedMessage.signature)) // generate Ed25519 identity
      
      // set actors
      const _childActor = createChildActor(identity)
      setChildActor(_childActor)

      // save identity
      const account = {address, type: 'Svm'}
      saveIdentity(identity, account)
      setIdentity(identity)
      setAccount(account)

      // link address
      const publicKey = Buffer.from(bs58.decode(signedMessage.publicKey)).toString('hex')
      const signature = Buffer.from(bs58.decode(signedMessage.signature)).toString('hex')
      const message = Buffer.from(encodedMessage).toString('hex')
      const response = await _childActor.create_profile({Svm: { public_key: publicKey, signature, message }});
      const profile = response.Ok
      
      toast({ title: 'Signed in with Solana', status: 'success', duration: 4000, isClosable: true })

      return profile
    } catch (error) {
      console.log(error)
      toast({ title: error.message, status: 'error', duration: 4000, isClosable: true })
    }
	}

  const logout = () => {
    clearIdentity()
  }

  const login = async (type) => {
    if(type === 'evm') {
      return await loginWithEvm()
    } else if(type === 'svm') {
      return await loginWithSvm()
    }
  }

  const value = { account, identity, childActor, login, logout, setAccount }
  
  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  )
}
export { IdentityContext, IdentityProvider }
