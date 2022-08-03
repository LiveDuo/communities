import { createContext, useState, useEffect, useCallback } from 'react'
import { useEthers } from '@usedapp/core'

import { createParentActor } from '../agents/parent'

import { loadIdentity, clearIdentity } from '../utils/identity'

import { useToast } from '@chakra-ui/react'

import { ledgerCanisterId } from '../agents/ledger'
import { parentCanisterId } from '../agents/parent'

const IdentityContext = createContext()

const IdentityProvider = ({children}) => {

  const { account } = useEthers()

  const [parentActor, setParentActor] = useState()

  const [walletConnected, setWalletConnected] = useState(false)
	const [userPrincipal, setUserPrincipal] = useState('')
	const [host, setHost] = useState('')
	const toast = useToast()

	const load = useCallback(async () => {
		// setIsLocalhost(window.location.host.startsWith('localhost'))

		if (!window.ic?.plug) {
			toast({ description: 'Plug wallet not installed', status: 'error' })
			return
		}

		const connected = await window.ic.plug.isConnected()
		if (connected) {
			const principal = await window.ic?.plug.getPrincipal()
			setUserPrincipal(principal.toString())
			setHost(window.ic?.plug.sessionManager.host)
			setWalletConnected(true)
		}
	}, [toast])

	useEffect(() => {
		load()
	}, [load])

	const onConnect = async (hostType) => {
		const host = hostType === 'localhost' ? 'http://127.0.0.1:8000/' : 'https://mainnet.dfinity.network'
		const whitelist = [ledgerCanisterId, parentCanisterId]
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

	const onDisconnect = async () => {
		const p1 = new Promise((r) => setTimeout(() => r(), 1000))
		const p2 = window.ic.plug.disconnect() // not resolving
		await Promise.race([p1, p2]) // hacky fix

		setUserPrincipal('')
		setWalletConnected(false)
		setHost('')

		toast({ description: 'Disconnected' })
	}

  useEffect(() => {
    const identity = loadIdentity(account)
    const _parentActor = createParentActor(identity)
    setParentActor(_parentActor)
  }, [account])

  const logout = () => clearIdentity(account)
  const value = { parentActor, logout, walletConnected, userPrincipal, host, onConnect, onDisconnect }
  
  // walletConnected, userPrincipal, host

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  )
}
export { IdentityContext, IdentityProvider }
