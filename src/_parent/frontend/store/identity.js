import { createContext, useState, useCallback, useEffect, useMemo } from 'react'

import { useToast, useDisclosure } from '@chakra-ui/react'

import { parentCanisterId } from './parent'
import { ledgerCanisterId } from './ledger'
import { cmcCanisterId } from './cmc'
import { Actor } from '@dfinity/agent'

import { isLocal } from '../utils/url'
import { getAgent } from '../utils/agent'

const IdentityContext = createContext()

const IdentityProvider = ({ children }) => {

	const [walletConnected, setWalletConnected] = useState(false)
	const [walletDetected, setWalletDetected] = useState(false)
	const [userPrincipal, setUserPrincipal] = useState(null)
	const [walletName, setWalletName] = useState(null)
	
	const noWalletDisclosure = useDisclosure()
	const icWalletDisclosure = useDisclosure()

	const toast = useToast()

	const host = useMemo(()=> isLocal ? 'http://localhost:8000/' : undefined, [])
	

	const loadWallet = useCallback(async () => {
		// check wallet connected
		let _walletName
		const isConnectedWithInfinity = await window?.ic?.infinityWallet?.isConnected()
		const isConnectedWithPlug = await window?.ic?.plug?.isConnected()
		if(isConnectedWithInfinity) {
			_walletName = 'infinityWallet'
		} else if(isConnectedWithPlug) {
			_walletName = 'plug'
		} else {
			return
		}

		// load params
		const principal = await window?.ic[_walletName].getPrincipal()
		setUserPrincipal(principal.toString())
		setWalletConnected(true)
		setWalletName(_walletName)
	}, [])

	useEffect(() => {
		setWalletDetected(!!(window?.ic?.plug || window?.ic?.infinityWallet))
	}, [])


	const isWalletDetected = useCallback((type) => !!window?.ic?.hasOwnProperty(type), [])
	
	const createActor = useCallback(async (options) => {
		if(options.type === 'wallet')  {
			const actorOptions = {canisterId: options.canisterId, interfaceFactory: options.interfaceFactory, host: host}
			return await window?.ic[walletName].createActor(actorOptions)
		} else if(options.type === 'anonymous') {
			const actorOptions = { agent: getAgent(null), canisterId: options.canisterId, host: host, identity: null}
			return Actor.createActor(options.interfaceFactory, actorOptions)
		}
	},[walletName, host])

	const batchTransactions = (txs) => {
		const options = { host }
		return window?.ic[walletName].batchTransactions(txs, options)
	}

	const connect = async (wallet) => {
		const whitelist = [...ledgerCanisterId ? [ledgerCanisterId] : [], ...cmcCanisterId ? [cmcCanisterId] : [], parentCanisterId]
		try {
			const hasAllowed = await window?.ic[wallet]?.requestConnect({ host, whitelist })
			const principal = await window?.ic[wallet]?.getPrincipal()
			setUserPrincipal(principal.toString())
			setWalletConnected(!!hasAllowed)
			toast({ description: 'Connected' })
		} catch (error) {
			if (error.message === 'The agent creation was rejected.') {
				toast({ description: 'Wallet connection declined', status: 'info' })
			} else {
				toast({ description: 'Wallet connection failed', status: 'error' })
			}
		}
	}

	const disconnect = async () => {
		await window?.ic[walletName].disconnect() // not resolving with plug wallet

		setUserPrincipal()
		setWalletConnected(false)

		toast({ description: 'Disconnected' })
	}

	useEffect(()=>{
		if (walletDetected) {
			loadWallet()
		}
	},[loadWallet, walletDetected])

	const value = { noWalletDisclosure, icWalletDisclosure, setWalletName, createActor, isWalletDetected, userPrincipal, connect, disconnect, loadWallet, walletConnected, walletDetected, batchTransactions }

	return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
	
}
export { IdentityContext, IdentityProvider }
