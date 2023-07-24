import { createContext, useState, useCallback, useEffect } from 'react'

import { useToast, useDisclosure } from '@chakra-ui/react'

import { parentCanisterId } from './parent'
import { ledgerCanisterId } from './ledger'

import { isLocal } from '../utils/url'

const IdentityContext = createContext()

const walletName = 'plug' // or 'infinityWallet'
const walletObject = window.ic?.[walletName]

const IdentityProvider = ({ children }) => {

	const [walletConnected, setWalletConnected] = useState(false)
	const [walletDetected, setWalletDetected] = useState(false)
	const [userPrincipal, setUserPrincipal] = useState(null)
	
	const walletDisclosure = useDisclosure()

	const toast = useToast()

	const host = isLocal ? 'http://localhost:8000/' : 'https://mainnet.dfinity.network'

	const loadWallet = useCallback(async () => {
		
		// check connected
		const connected = await walletObject.isConnected()
		if (!connected) return

		// load params
		const principal = await walletObject.getPrincipal()
		setUserPrincipal(principal.toString())
		setWalletConnected(true)
	
	}, [])

	useEffect(() => {
		setWalletDetected(!!walletObject)
	}, [])
	
	const createActor = (options) => {
		options.host = host
		return walletObject.createActor(options)
	}

	const batchTransactions = (...params) => {
		return walletObject.batchTransactions(...params)
	}

	const connect = async () => {
		const whitelist = ledgerCanisterId ? [ledgerCanisterId, parentCanisterId] : [parentCanisterId]
		try {
			const hasAllowed = await walletObject?.requestConnect({ host, whitelist })
			const principal = await walletObject?.getPrincipal()
			setUserPrincipal(principal.toString())
			setWalletConnected(!!hasAllowed)
			toast({ description: 'Connected' })
		} catch (error) {
			console.log(error.message)
			if (error.message === 'The agent creation was rejected.') {
				toast({ description: 'Wallet connection declined', status: 'info' })
			} else {
				toast({ description: 'Wallet connection failed', status: 'error' })
			}
		}
	}

	const disconnect = async () => {
		// not resolving
		await walletObject.disconnect()

		setUserPrincipal()
		setWalletConnected(false)

		toast({ description: 'Disconnected' })
	}

	useEffect(()=>{
		if (walletDetected) {
			loadWallet()
		}
	},[loadWallet, walletDetected])

	const value = { walletDisclosure, createActor, userPrincipal, connect, disconnect, loadWallet, walletConnected, walletDetected, batchTransactions }

	return (
		<IdentityContext.Provider value={value}>
			{children}
		</IdentityContext.Provider>
	)
}
export { IdentityContext, IdentityProvider }
