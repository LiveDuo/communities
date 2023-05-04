import { createContext, useState, useEffect } from 'react'
import { useToast, useDisclosure } from '@chakra-ui/react'
import { utils , ethers} from 'ethers'
import bs58 from 'bs58'
import { Ed25519KeyIdentity } from '@dfinity/identity'

import { createChildActor, idlChildFactory } from '../agents/child'

import { getLoginMessage, getIdentityFromSignature } from '../utils/identity'
import { saveIdentity, loadIdentity, clearIdentity } from '../utils/identity'

const IdentityContext = createContext()

const IdentityProvider = ({children}) => {
  const [account, setAccount] = useState()
  const [identity, setIdentity] = useState()
  const [selectedNetwork, setSelectedNetwork] = useState()
  const [childActor, setChildActor] = useState()

  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure()

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
      const identity = getIdentityFromSignature() // generate Ed25519 identity
      const loginMessage = getLoginMessage(identity.getPrincipal().toString())
      const signature = await signer.signMessage(loginMessage)// sign with metamask
      
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
      const identity = getIdentityFromSignature() // generate Ed25519 identity
      const loginMessage = getLoginMessage(identity.getPrincipal().toString())
      
      // get identity
      const encodedMessage = new TextEncoder().encode(loginMessage)
      const signedMessage = await phantom.request({ method: 'signMessage', params: { message: encodedMessage } })

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

  const loginWithIc = async () => {
    try {

      const canisterId = process.env.REACT_APP_CHILD_CANISTER_ID
      const isConnected = await window.ic.plug.isConnected()

      if(!isConnected) {
        const whitelist = [canisterId]
        await window.ic.plug.requestConnect({whitelist});
      }

      
      const _childActor = await window.ic.plug.createActor({
        canisterId: canisterId,
        interfaceFactory: idlChildFactory,
      });

      setChildActor(_childActor)
      
      
      const principal = await window.ic.plug.getPrincipal()
      const account = {address: principal.toString(), type: 'Ic'}

      const identity = null
      saveIdentity(identity, account)
      setIdentity(identity)
      setAccount(account)


      return

      // // link address
      // const publicKey = Buffer.from(bs58.decode(signedMessage.publicKey)).toString('hex')
      // const signature = Buffer.from(bs58.decode(signedMessage.signature)).toString('hex')
      // const message = Buffer.from(encodedMessage).toString('hex')
      // const response = await _childActor.create_profile({Svm: { public_key: publicKey, signature, message }});
      // const profile = response.Ok
      
      // toast({ title: 'Signed in with Solana', status: 'success', duration: 4000, isClosable: true })

      // return profile
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
    } else if(type === 'ic'){
      return await loginWithIc()
    }
  }

  const value = { account, identity, childActor, login, logout, setAccount, isModalOpen, onModalOpen, onModalClose, setSelectedNetwork, selectedNetwork }
  
  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  )
}
export { IdentityContext, IdentityProvider }
