import { createContext, useState, useCallback, useEffect } from 'react'

import { useToast } from '@chakra-ui/react'

import { parentCanisterId } from './parent'
import { ledgerCanisterId } from './ledger'

import { isLocal } from '../utils/url'

const IdentityContext = createContext()

const IdentityProvider = ({ children }) => {

	const [walletConnected, setWalletConnected] = useState(false)
	const [walletDetected, setWalletDetected] = useState(false)
	const [userPrincipal, setUserPrincipal] = useState('')
	const [host, setHost] = useState('')
	const toast = useToast()

	const loadWallet = useCallback(async () => {
		
		// check connected
		const connected = await window.ic.plug.isConnected()
		if (!connected) return

		// load params
		const principal = await window.ic?.plug.getPrincipal()
		setUserPrincipal(principal.toString())
		setHost(window.ic?.plug.sessionManager.host)
		setWalletConnected(true)
	
	}, [])

	useEffect(() => {
		setWalletDetected(!!window?.ic?.plug)
	}, [])
	
	const createActor = (...params) => {
		return window.ic?.plug.createActor(...params)
	}

	const batchTransactions = (...params) => {
		return window.ic.plug.batchTransactions(...params)
	}

	const connect = async () => {
		const host = isLocal === 'localhost' ? 'http://127.0.0.1:8000/' : 'https://mainnet.dfinity.network'
		const whitelist = ledgerCanisterId ? [ledgerCanisterId, parentCanisterId] : [parentCanisterId]
		try {
			const hasAllowed = await window.ic?.plug?.requestConnect({ host, whitelist })
			const principal = await window.ic?.plug.getPrincipal()
			setUserPrincipal(principal.toString())
			setWalletConnected(!!hasAllowed)
			setHost(window.ic?.plug.sessionManager.host)
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
		// await window.ic.plug.disconnect()

		setUserPrincipal('')
		setWalletConnected(false)
		setHost('')

		toast({ description: 'Disconnected' })
	}

	useEffect(()=>{
		if (walletDetected) {
			loadWallet()
		}
	},[loadWallet])

	const value = { createActor, userPrincipal, host, connect, disconnect, loadWallet, walletConnected, walletDetected, batchTransactions }

	return (
		<IdentityContext.Provider value={value}>
			{children}
		</IdentityContext.Provider>
	)
}
export { IdentityContext, IdentityProvider }
