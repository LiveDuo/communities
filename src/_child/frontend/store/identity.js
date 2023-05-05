import { createContext, useState, useEffect } from 'react'
import { useToast, useDisclosure } from '@chakra-ui/react'
import { utils , ethers} from 'ethers'
import bs58 from 'bs58'

import { createChildActor, createChildActorFromPlug } from '../agents/child'
import { createManagementActor, createManagementActorFromPlug } from '../agents/management'

import { getLoginMessage, getIdentityFromSignature } from '../utils/identity'
import { saveAccount, loadAccount, clearAccount } from '../utils/stoge'

const IdentityContext = createContext()

const IdentityProvider = ({children}) => {
  const [account, setAccount] = useState()
  const [principal, setPrincipal] = useState()

  const [selectedNetwork, setSelectedNetwork] = useState()
  const [childActor, setChildActor] = useState()
  const [managementActor, setManagementActor] = useState()

  const { isOpen: isWalletModalOpen, onOpen: onWalletModalOpen, onClose: onWalletModalClose } = useDisclosure()
  const { isOpen: isUpgradeModalOpen, onOpen: onUpgradeModalOpen, onClose: onUpgradeModalClose } = useDisclosure()

  const toast = useToast()

  const loadActor = async (account, identity) => {
    let _childActor, _principal, _managementActor
    if(!account) {
      _childActor = createChildActor(null)
      _managementActor = createManagementActor(null)
    } else if (account.type ==='Evm' || account.type ==='Svm') {
      _childActor = createChildActor(identity)
      _managementActor = createManagementActor(identity)
      _principal = identity.getPrincipal()
    } else if(account.type === 'Ic') {
      _childActor = await createChildActorFromPlug()
      _managementActor = await createManagementActorFromPlug()
      _principal = await window.ic.plug.getPrincipal()
    }
    setChildActor(_childActor)
    setManagementActor(_managementActor)
    setPrincipal(_principal)

  }
  
  useEffect(() => {
    const data = loadAccount()
    setAccount(data?.account)
    loadActor(data?.account, data?.identity)
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
      saveAccount(identity, account)
      setPrincipal(identity.getPrincipal())
      setAccount(account)

      // set actors
      const _childActor = createChildActor(identity)
      const _managementActor = createManagementActor(identity)
      setChildActor(_childActor)
      setManagementActor(_managementActor)

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
      const _managementActor = createManagementActor(identity)
      setChildActor(_childActor)
      setManagementActor(_managementActor)
      // save identity
      const account = {address, type: 'Svm'}
      saveAccount(identity, account)
      setPrincipal(identity.getPrincipal())
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
      const _childActor = await createChildActorFromPlug()
      const _managementActor = await createManagementActorFromPlug()
      setChildActor(_childActor)
      setManagementActor(_managementActor)
      
      const principal = await window.ic.plug.getPrincipal()
      const account = {address: principal.toString(), type: 'Ic'}
      saveAccount(undefined, account)
      setPrincipal(principal)
      setAccount(account)

      const response = await _childActor.create_profile({Ic: null});
      const profile = response.Ok
      
      toast({ title: 'Signed in with Internet Computer', status: 'success', duration: 4000, isClosable: true })

      return profile
    } catch (error) {
      console.log(error)
      toast({ title: error.message, status: 'error', duration: 4000, isClosable: true })
    }
	}

  const logout = async () => {
    if (account.type === 'Ic') {
      const isConnected = await window.ic.plug.isConnected()
      if(isConnected) {
        const p1 = new Promise((r) => setTimeout(() => r(), 1000))
        const p2 = window.ic.plug.disconnect() // not resolving
        await Promise.race([p1, p2]) // hacky fix
      }
    }
    clearAccount()
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

  const value = { account, principal, childActor, managementActor, login, logout, setAccount, isWalletModalOpen, onWalletModalOpen, onWalletModalClose, isUpgradeModalOpen, onUpgradeModalOpen, onUpgradeModalClose,  setSelectedNetwork, selectedNetwork }
  
  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  )
}
export { IdentityContext, IdentityProvider }
