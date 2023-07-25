import { createContext, useState, useEffect, useCallback } from 'react'
import { useDisclosure } from '@chakra-ui/react'

import {loadAccount, clearAccount, saveAccount } from '../utils/stoge'

import { Actor } from '@dfinity/agent'

import { CHILD_CANISTER_ID } from './child'
import { MANAGEMENT_CANISTER_ID } from './management'

import { getAgent, icHost } from '../utils/agent'
import { isLocal} from '../utils/url'

import { ethers } from 'ethers'

const IdentityContext = createContext()

const IdentityProvider = ({children}) => {
  
  const [account, setAccount] = useState()
  const [identity, setIdentity] = useState()
  const [principal, setPrincipal] = useState()
  const [selectedNetwork, setSelectedNetwork] = useState()
  const [walletIcName, setWalletIcName] = useState(null)

  const { isOpen: isWalletModalOpen, onOpen: onWalletModalOpen, onClose: onWalletModalClose } = useDisclosure()
  const { isOpen: isUpgradeModalOpen, onOpen: onUpgradeModalOpen, onClose: onUpgradeModalClose } = useDisclosure()
  const icWalletDisclosure = useDisclosure()

  const host = isLocal ? 'http://localhost:8000/' : 'https://mainnet.dfinity.network'
  
  const updatePrincipal = useCallback(async (account, identity) => {
    if (!account)
      setPrincipal(null)
    else if (account.type ==='Evm' || account.type ==='Svm')
      setPrincipal(identity.getPrincipal())
    else if(account.type === 'Ic') 
      setPrincipal(await window.ic[walletIcName]?.getPrincipal())
  },[walletIcName])


  const loadWallet = useCallback(async ()=>{
		const isConnectedWithInfinity = await window?.ic?.infinityWallet?.isConnected()
		const isConnectedWithPlug = await window?.ic?.plug?.isConnected()
		if(isConnectedWithInfinity) {
      setWalletIcName('infinityWallet')
			return 'infinityWallet'
		} else if(isConnectedWithPlug) {
      setWalletIcName('plug')
			return 'plug'
		} else {
			return
		}
  },[])
  
  useEffect(() => {
    const data = loadAccount()
    loadWallet()
    updatePrincipal(data?.account, data?.identity)
    setAccount(data?.account)
    setIdentity(data?.identity)
  }, [loadWallet, updatePrincipal])

  const updateIdentity = useCallback(async (type, identity, walletIcName) => {
    let _account, _principal
    if(type === 'Evm') {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      _account = {type: 'Evm', address: address}
      _principal = identity.getPrincipal()
    } else if( type === 'Svm') {
      const phantom = window.solana
      const address = phantom.publicKey.toString()
      _account = {type: 'Svm', address: address}
      _principal = identity.getPrincipal()
    } else if (type === 'Ic') {
      _principal = await window.ic[walletIcName].getPrincipal()
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
      return window.ic?.infinityWallet ?? window.ic?.plug
  }, [])

  const isWalletDetected = useCallback((type) => {
    return !!getWallet(type)
  }, [getWallet])

  const connectWallet = useCallback(async (type, wallet) => {
    if (type === 'ic') {
      // check connected
      const isConnected = await window.ic[wallet]?.isConnected()
      if(isConnected) return
      
      // request connect
      const whitelist = [CHILD_CANISTER_ID, MANAGEMENT_CANISTER_ID]
      await window.ic[wallet]?.requestConnect({whitelist, host});
    }
  }, [host])
  
  const createActor = useCallback(async(options) => {
    console.log(options)
    if (options.type === 'ic') {
      const actorOptions = {canisterId: options.canisterId, interfaceFactory: options.interfaceFactory, host: host}
	    return await window.ic[options.wallet ?? walletIcName]?.createActor(actorOptions)
    } else {
      const actorOptions = { agent: getAgent(options.identity), canisterId: options.canisterId, host: icHost, identity: options.identity}
      return Actor.createActor(options.interfaceFactory, actorOptions)
    }
	}, [host, walletIcName])



  const disconnect = async () => {
    if (account.type === 'Ic') {
      const isConnected = await window.ic?.[walletIcName].isConnected()
      if (!isConnected) return
      await window.ic?.[walletIcName].disconnect() // not resolving
    }
    clearAccount()
  }

  const value = { identity, account, principal, updateIdentity, disconnect, setAccount, createActor, isWalletDetected, getWallet, connectWallet, isWalletModalOpen, onWalletModalOpen, onWalletModalClose, isUpgradeModalOpen, onUpgradeModalOpen, onUpgradeModalClose,  setSelectedNetwork, selectedNetwork, icWalletDisclosure, setWalletIcName }
  
  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
  
}
export { IdentityContext, IdentityProvider }
