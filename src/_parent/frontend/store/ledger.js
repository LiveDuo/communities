import { useState, createContext } from 'react'
import { useToast } from '@chakra-ui/react'

// import { IdentityContext } from './identity'

import { ledgerCanisterId, idlLedgerFactory } from '../agents/ledger'

import { getAccountId } from '../utils/account'

const LedgerContext = createContext()

const transferAmount = 0.5

const LedgerProvider = ({ children }) => {

	const toast = useToast()
	const [loading, setLoading] = useState()
	// const { parentActor } = useContext(IdentityContext)

	const requestTransfer = async (transferParams) => {
		await window.ic?.plug.requestTransfer(transferParams)
	}
	
	const requestBalance = async () => {
		const balance = await window.ic?.plug.requestBalance()
		return balance
	}
	
	const createLedgerActor = async () => {
		const actor = await window.ic?.plug.createActor({ canisterId: ledgerCanisterId, interfaceFactory: idlLedgerFactory })
		return actor
	}

	const requestTransferICP = async (parentCanisterId, userPrincipal) => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		const transferParams = { to: accountId, amount: transferAmount * 1e8 }
		try {
			await requestTransfer(transferParams)
			toast({ description: `Transfer success` })
		} catch (error) {
			toast({ description: 'Transfer failed', status: "error" })
		}
	}

	const requestBalanceICP = async () => {
		try {
			const requestBalanceResponse = await requestBalance()
			const balance = requestBalanceResponse.find(c => c.symbol === 'ICP').amount
			toast({ description: `Balance: ${balance} ICP` })
		} catch (error) {
			toast({ description: 'Balance failed', status: 'error' })
		}
	}

	const ledgerTransferICP = async (parentCanisterId, userPrincipal) => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		const actor = await createLedgerActor()
		const sendParams = {
			to: accountId, fee: { e8s: 0n },
			amount: { e8s: transferAmount * 1e8 }, memo: 0, from_subaccount: [], created_at_time: []
		}
		try {
			await actor.send_dfx(sendParams)
			toast({ description: 'Transfer success' })
		} catch (error) {
			toast({ description: 'Transfer failed' })
		}
	}

	const ledgerBalanceICP = async (parentCanisterId, userPrincipal) => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		const actor = await createLedgerActor()
		try {
			const response = await actor.account_balance_dfx({ account: accountId })
			toast({ description: `Balance: ${Number(response.e8s) / 1e8} ICP` })
		} catch (error) {
			const description = error.result?.reject_message ?? 'Balance failed'
			toast({ description, status: 'error' })
		}
	}

	const callAdminBalance = async (parentCanisterId) => {
		const accountId = getAccountId(parentCanisterId)
		const actor = await createLedgerActor()
		try {
			const response = await actor.account_balance_dfx({ account: accountId })
			toast({ description: `Balance: ${Number(response.e8s) / 1e8} ICP` })
		} catch (error) {
			console.error()
			const description = error.result?.reject_message ?? 'Balance failed'
			toast({ description, status: 'error' })
		}
	}

	const value = { requestTransferICP, requestBalanceICP, ledgerTransferICP, ledgerBalanceICP, callAdminBalance, loading, setLoading }

	return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export { LedgerContext, LedgerProvider }
