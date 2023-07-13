import { createContext, useState, useEffect, useCallback } from 'react'

import { createParentActor } from '../agents/parent'

import { useToast, useDisclosure } from '@chakra-ui/react'

import { ledgerCanisterId, createLedgerActorPlug } from '../agents/ledger'
import { parentCanisterId, createParentActorPlug } from '../agents/parent'

import { isLocal } from '../agents'

const IdentityContext = createContext()

const IdentityProvider = ({ children }) => {

	const [parentActor, setParentActor] = useState()
	const [parentActorPlug, setParentActorPlug] = useState()
	const [ledgerActorPlug, setLedgerActorPlug] = useState()

	const [walletConnected, setWalletConnected] = useState(false)
	const [userPrincipal, setUserPrincipal] = useState('')
	const [host, setHost] = useState('')
	const toast = useToast()

	const modalDisclosure = useDisclosure()

	const loadPlug = useCallback(async () => {
		// setIsLocalhost(window.location.hostname.endsWith('localhost'))
		const connected = await window.ic.plug.isConnected()
		if (connected) {
			const principal = await window.ic?.plug.getPrincipal()
			setUserPrincipal(principal.toString())
			setHost(window.ic?.plug.sessionManager.host)
			setWalletConnected(true)
		}
	}, [])


	const connect = async () => {
		const hostType = isLocal ? 'localhost' : 'mainnet'
		const host = hostType === 'localhost' ? 'http://127.0.0.1:8000/' : 'https://mainnet.dfinity.network'
		const whitelist = ledgerCanisterId ? [ledgerCanisterId, parentCanisterId] : [parentCanisterId]
		try {
			const hasAllowed = await window.ic?.plug?.requestConnect({ host, whitelist })
			const principal = await window.ic?.plug.getPrincipal()
			setUserPrincipal(principal.toString())
			setWalletConnected(!!hasAllowed)
			setHost(window.ic?.plug.sessionManager.host)
			toast({ description: 'Connected' })
		} catch (error) {
			toast({ description: 'Wallet connection failed', status: 'error' })
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

	const loadActors = useCallback(async () => {
		const _parentActor = createParentActor(null)
		setParentActor(_parentActor)

		const connected = await window.ic.plug.isConnected()
		if (connected) {
			const _parentActorPlug = await createParentActorPlug()
			setParentActorPlug(_parentActorPlug)
			
			if (ledgerCanisterId) {
				const _ledgerActorPlug = await createLedgerActorPlug()
				setLedgerActorPlug(_ledgerActorPlug)
			}
		}
	}, [])
	
	useEffect(() => {
		loadActors()
	}, [loadActors])

	const value = { parentActor, walletConnected, userPrincipal, parentActorPlug, ledgerActorPlug, host, connect, disconnect, loadPlug, modalDisclosure }

	return (
		<IdentityContext.Provider value={value}>
			{children}
		</IdentityContext.Provider>
	)
}
export { IdentityContext, IdentityProvider }
