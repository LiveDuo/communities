import { useState, useContext, createContext } from 'react'
import { useToast } from '@chakra-ui/react'

import { IdentityContext } from './identity'

import { getAccountId } from '../utils/account'

import { idlLedgerFactory, ledgerCanisterId } from '../agents/ledger'

const LedgerContext = createContext()

const transferAmount = 0.5

const LedgerProvider = ({ children }) => {

	const toast = useToast()
	const [loading, setLoading] = useState()
	const { ledgerActorPlug } = useContext(IdentityContext)

	const requestTransferICP = async (parentCanisterId, userPrincipal) => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		const transferParams = { to: accountId, amount: transferAmount * 1e8 }
		try {
			await window.ic?.plug.requestTransfer(transferParams)
			toast({ description: `Transfer success` })
		} catch (error) {
			toast({ description: 'Transfer failed', status: "error" })
		}
	}

	const requestBalanceICP = async () => {
		try {
			const requestBalanceResponse = await window.ic?.plug.requestBalance()
			const balance = requestBalanceResponse.find(c => c.symbol === 'ICP').amount
			toast({ description: `Balance: ${balance} ICP` })
		} catch (error) {
			toast({ description: 'Balance failed', status: 'error' })
		}
	}

	const ledgerTransferICP = async (parentCanisterId, userPrincipal) => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		const sendParams = {
			to: accountId, fee: { e8s: 0n },
			amount: { e8s: transferAmount * 1e8 }, memo: 0, from_subaccount: [], created_at_time: []
		}
		try {
			await ledgerActorPlug.send_dfx(sendParams)
			toast({ description: 'Transfer success' })
		} catch (error) {
			toast({ description: 'Transfer failed', status: 'error' })
		}
	}

	const ledgerBalanceICP = async (parentCanisterId, userPrincipal) => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		try {
			const response = await ledgerActorPlug.account_balance_dfx({ account: accountId })
			toast({ description: `Balance: ${Number(response.e8s) / 1e8} ICP` })
		} catch (error) {
			const description = error.result?.reject_message ?? 'Balance failed'
			toast({ description, status: 'error' })
		}
	}

	const callAdminBalance = async (parentCanisterId) => {
		const accountId = getAccountId(parentCanisterId)
		try {
			const response = await ledgerActorPlug.account_balance_dfx({ account: accountId })
			toast({ description: `Balance: ${Number(response.e8s) / 1e8} ICP` })
		} catch (error) {
			const description = error.result?.reject_message ?? 'Balance failed'
			toast({ description, status: 'error' })
		}
	}

	const getTransferIcpTx = (params) => ({
		idl: idlLedgerFactory,
		canisterId: ledgerCanisterId,
		methodName: 'send_dfx',
		args: [{
			to: params.accountId,
			fee: { e8s: 10000n }, // TODO: 0n for localhost
			amount: { e8s: params.amount },
			memo: 32n, // TODO: put random memo?
			from_subaccount: [],
			created_at_time: [],
		}],
		onSuccess: (res) => console.log('Success', res),
		onFail: (res) => console.log('Error', res)
	})

	const value = { getTransferIcpTx, requestTransferICP, requestBalanceICP, ledgerTransferICP, ledgerBalanceICP, callAdminBalance, loading, setLoading }

	return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export { LedgerContext, LedgerProvider }
