import { createContext, useState, useEffect, useCallback } from 'react'
import { useDisclosure } from '@chakra-ui/react'

import {loadAccount, clearAccount, saveAccount } from '../utils/stoge'

import { Actor } from '@dfinity/agent'

import { CHILD_CANISTER_ID } from './child'
import { MANAGEMENT_CANISTER_ID } from './management'

import { getAgent, icHost } from '../utils/agent'
import { isLocal} from '../utils/url'

import { ethers } from 'ethers'

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

  const host = isLocal ? 'http://localhost:8000/' : 'https://mainnet.dfinity.network'
  
  const updatePrincipal = async (account, identity) => {
    if (!account)
      setPrincipal(null)
    else if (account.type ==='Evm' || account.type ==='Svm')
      setPrincipal(identity.getPrincipal())
    else if(account.type === 'Ic') 
      setPrincipal(await walletIcObject.getPrincipal())
  }
  
  useEffect(() => {
    const data = loadAccount()
    updatePrincipal(data?.account, data?.identity)
    setAccount(data?.account)
    setIdentity(data?.identity)
  }, [])

  const updateIdentity = useCallback(async (type, identity) => {
    let _account, _principal
    if(type === 'Evm') {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      _account = {type: 'Evm', address: address}
      _principal = identity.getPrincipal()
    } else if( type === 'Evm') {
      const phantom = window.solana
      const address = phantom.publicKey.toString()
      _account = {type: 'Svm', address: address}
      _principal = identity.getPrincipal()
    } else if (type === 'Ic') {
      _principal = await walletIcObject.getPrincipal()
      _account = {address: _principal.toString(), type: 'Ic'}
    }
    setAccount(_account)
    setPrincipal(_principal)
    setIdentity(identity)
    saveAccount(identity, _account)
  }, [])

  const getWallet = useCallback((type) => {
    if (type === 'evm') 
      return window?.ethereum
    else if(type === 'svm')
      return window?.solana
    else if(type === 'ic')
      return window.ic?.[walletIcName]
  }, [])

  const isWalletDetected = useCallback((type) => {
    return !!getWallet(type)
  }, [getWallet])

  const connectWallet = useCallback(async (type) => {
    if (type === 'ic') {
      
      // check connected
      const isConnected = await walletIcObject.isConnected()
      if(isConnected) return

      // request connect
      const whitelist = [CHILD_CANISTER_ID, MANAGEMENT_CANISTER_ID]
      await walletIcObject.requestConnect({whitelist, host});
    }
  }, [host])
  
  const createActor = useCallback(async(options) => {
    if (options.type === 'ic') {
      const actorOptions = {canisterId: options.canisterId, interfaceFactory: options.interfaceFactory, host: host}
	    return await walletIcObject.createActor(actorOptions)
    } else {
      const actorOptions = { agent: getAgent(options.identity), canisterId: options.canisterId, host: icHost, identity: options.identity}
      return Actor.createActor(options.interfaceFactory, actorOptions)
    }
	}, [host])



  const disconnect = async () => {
    if (account.type === 'Ic') {
      const isConnected = await walletIcObject.isConnected()
      if (!isConnected) return
      await walletIcObject.disconnect() // not resolving
    }
    clearAccount()
  }

  const value = { identity, account, principal, updateIdentity, disconnect, setAccount, createActor, isWalletDetected, getWallet, connectWallet, isWalletModalOpen, onWalletModalOpen, onWalletModalClose, isUpgradeModalOpen, onUpgradeModalOpen, onUpgradeModalClose,  setSelectedNetwork, selectedNetwork }
  
  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
  
}
export { IdentityContext, IdentityProvider }
