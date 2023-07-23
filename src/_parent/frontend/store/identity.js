import { createContext, useState, useCallback, useEffect } from 'react'

import { useToast, useDisclosure } from '@chakra-ui/react'

import { parentCanisterId } from './parent'
import { ledgerCanisterId } from './ledger'

import { isLocal } from '../utils/url'

const IdentityContext = createContext()

const wallet_name = 'plug' // or 'infinityWallet'
const wallet_object = window.ic?.[wallet_name]

const IdentityProvider = ({ children }) => {

	const [walletConnected, setWalletConnected] = useState(false)
	const [walletDetected, setWalletDetected] = useState(false)
	const [userPrincipal, setUserPrincipal] = useState('')
	const toast = useToast()
	const walletDisclosure = useDisclosure()

	const loadWallet = useCallback(async () => {
		
		// check connected
		const connected = await wallet_object.isConnected()
		if (!connected) return

		// load params
		const principal = await wallet_object.getPrincipal()
		setUserPrincipal(principal.toString())
		setWalletConnected(true)
	
	}, [])

	useEffect(() => {
		setWalletDetected(!!wallet_object)
	}, [])
	
	const createActor = (...params) => {
		return wallet_object.createActor(...params)
	}

	const batchTransactions = (...params) => {
		return wallet_object.batchTransactions(...params)
	}

	const connect = async () => {
		const host = isLocal === 'localhost' ? 'http://127.0.0.1:8000/' : 'https://mainnet.dfinity.network'
		const whitelist = ledgerCanisterId ? [ledgerCanisterId, parentCanisterId] : [parentCanisterId]
		try {
			const hasAllowed = await wallet_object?.requestConnect({ host, whitelist })
			const principal = await wallet_object?.getPrincipal()
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
		// await wallet_object.disconnect()

		setUserPrincipal('')
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
