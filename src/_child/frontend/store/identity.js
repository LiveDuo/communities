import { createContext, useState, useEffect, useCallback } from 'react'
import { useDisclosure } from '@chakra-ui/react'

import {loadAccount, clearAccount, saveAccount } from '../utils/stoge'

import { Actor } from '@dfinity/agent'

import { CHILD_CANISTER_ID } from './child'
import { MANAGEMENT_CANISTER_ID } from './management'

import { getAgent, icHost } from '../utils/agent'
import { isLocal} from '../utils/url'


const walletIcName = 'infinityWallet' // or 'plug'
const walletIcObject = window.ic?.[walletIcName]

const IdentityContext = createContext()

const IdentityProvider = ({children}) => {
  const [account, setAccount] = useState()
  const [identity, setIdentity] = useState()
  const [principal, setPrincipal] = useState()

  const [selectedNetwork, setSelectedNetwork] = useState()

  const { isOpen: isWalletModalOpen, onOpen: onWalletModalOpen, onClose: onWalletModalClose } = useDisclosure()
  const { isOpen: isUpgradeModalOpen, onOpen: onUpgradeModalOpen, onClose: onUpgradeModalClose } = useDisclosure()

  const loadPrincipal = async (account, identity) => {
    if(!account)
      setPrincipal(null)
    else if (account.type ==='Evm' || account.type ==='Svm')
      setPrincipal(identity.getPrincipal())
    else if(account.type === 'Ic') 
      setPrincipal(await walletIcObject.getPrincipal())
  }
  
  useEffect(() => {
    const data = loadAccount()
    loadPrincipal(data?.account, data?.identity)
    setAccount(data?.account)
    setIdentity(data?.identity)
  }, [])

  const setUser = useCallback( async (identity, account) => {
    const principal = identity ? identity.getPrincipal() : await walletIcObject.getPrincipal()
    setPrincipal(principal)
    saveAccount(identity, account)
    setAccount(account)
    setIdentity(identity)
  },[])

  const connectIcWallet = useCallback( async ()=>{
    const isConnected = await walletIcObject.isConnected()
    if(!isConnected) {
      const host = isLocal ? 'http://localhost:8000/' : 'https://mainnet.dfinity.network'
      const whitelist = [CHILD_CANISTER_ID, MANAGEMENT_CANISTER_ID]
      await walletIcObject.requestConnect({whitelist, host});
    }
  },[])

  const createActor = useCallback(async(options) => {
    if(options.type === 'ic') {
      await connectIcWallet()
      const host = isLocal && 'http://localhost:8000/'
	    return await walletIcObject.createActor({canisterId: options.canisterId, interfaceFactory: options.interfaceFactory, host: host})
    } else {
      return Actor.createActor(options.interfaceFactory, { agent: getAgent(options.identity), canisterId: options.canisterId, host: icHost, identity: options.identity})
    }
	},[connectIcWallet])

  
  const disconnect = async () => { // disconnect
    if (account.type === 'Ic') {
      const isConnected = await walletIcObject.isConnected()
      if(isConnected) {
        const p1 = new Promise((r) => setTimeout(() => r(), 1000))
        const p2 = walletIcObject.disconnect() // not resolving
        await Promise.race([p1, p2]) // hacky fix
      }
    }
    clearAccount()
  }

  const value = { identity, account, principal, setUser, disconnect, setAccount, connectIcWallet, createActor, isWalletModalOpen, onWalletModalOpen, onWalletModalClose, isUpgradeModalOpen, onUpgradeModalOpen, onUpgradeModalClose,  setSelectedNetwork, selectedNetwork }
  
  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  )
}
export { IdentityContext, IdentityProvider }
