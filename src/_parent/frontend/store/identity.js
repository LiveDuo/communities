import { createContext, useState, useCallback, useEffect } from 'react'

import { useToast, useDisclosure } from '@chakra-ui/react'

import { parentCanisterId } from './parent'
import { ledgerCanisterId } from './ledger'

import { isLocal } from '../utils/url'

const IdentityContext = createContext()

const IdentityProvider = ({ children }) => {

	const [walletConnected, setWalletConnected] = useState(false)
	const [walletDetected, setWalletDetected] = useState(false)
	const [userPrincipal, setUserPrincipal] = useState(null)
	const [walletName, setWalletName] = useState('')
	
	const noWalletDisclosure = useDisclosure()
	const icWalletDisclosure = useDisclosure()

	const toast = useToast()

	const host = isLocal ? 'http://localhost:8000/' : 'https://mainnet.dfinity.network'

	const loadWallet = useCallback(async () => {
		
		// check wallet connected
		let _walletName
		if(window?.ic?.infinityWallet) {
			const isConnected = await window?.ic?.infinityWallet.isConnected()
			_walletName = isConnected && 'infinityWallet'
		} else if(window?.ic?.plug) {
			const isConnected = await window?.ic?.plug.isConnected()
			_walletName = isConnected && 'plug'
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
	
	const createActor = (options) => {
		options.host = host
		return window?.ic[walletName].createActor(options)
	}

	const batchTransactions = (txs) => {
		const options = { host }
		return window?.ic[walletName].batchTransactions(txs, options)
	}

	const connect = async (wallet) => {
		const whitelist = ledgerCanisterId ? [ledgerCanisterId, parentCanisterId] : [parentCanisterId]
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

	const value = { noWalletDisclosure, icWalletDisclosure, setWalletName, createActor, userPrincipal, connect, disconnect, loadWallet, walletConnected, walletDetected, batchTransactions }

	return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
	
}
export { IdentityContext, IdentityProvider }
