import { createContext, useState, useCallback, useEffect } from 'react'

import { useToast } from '@chakra-ui/react'

import { parentCanisterId } from './parent'
import { ledgerCanisterId } from './ledger'

import { isLocal } from '../utils/url'

const IdentityContext = createContext()

const IdentityProvider = ({ children }) => {

	const [walletConnected, setWalletConnected] = useState(false)
	const [userPrincipal, setUserPrincipal] = useState('')
	const [host, setHost] = useState('')
	const toast = useToast()

	const loadWallet = useCallback(async () => {
		// setIsLocalhost(window.location.hostname.endsWith('localhost'))
		const connected = await window.ic.plug.isConnected()
		if (!connected) return
		const principal = await window.ic?.plug.getPrincipal()
		setUserPrincipal(principal.toString())
		setHost(window.ic?.plug.sessionManager.host)
		setWalletConnected(true)
	
	}, [])


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
		const p1 = new Promise((r) => setTimeout(() => r(), 1000))
		const p2 = window.ic.plug.disconnect() // not resolving
		await Promise.race([p1, p2]) // hacky fix

		setUserPrincipal('')
		setWalletConnected(false)
		setHost('')

		toast({ description: 'Disconnected' })
	}

	useEffect(()=>{
		if (window.ic?.plug) {
			loadWallet()
		}
	},[loadWallet])

	const value = { walletConnected, userPrincipal, host, connect, disconnect, loadWallet }

	return (
		<IdentityContext.Provider value={value}>
			{children}
		</IdentityContext.Provider>
	)
}
export { IdentityContext, IdentityProvider }
