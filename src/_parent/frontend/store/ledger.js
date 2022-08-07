import { useState, useContext, createContext, useEffect, useCallback } from 'react'
import { useToast } from '@chakra-ui/react'

import { IdentityContext } from './identity'

import { isLocalhost } from '../utils'
import { getAccountId } from '../utils/account'

import { idlLedgerFactory, ledgerCanisterId } from '../agents/ledger'
import { parentCanisterId } from '../agents/parent'

const LedgerContext = createContext()

const LedgerProvider = ({ children }) => {

	const toast = useToast()
	const [loading, setLoading] = useState()
	const { ledgerActorPlug, userPrincipal } = useContext(IdentityContext)
	const [balance, setBalance] = useState(null)

	const ledgerBalanceICP = useCallback(async (parentCanisterId, userPrincipal) => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		try {
			const response = await ledgerActorPlug.account_balance_dfx({ account: accountId })
			return Number(response.e8s)
		} catch (error) {
			const description = error.result?.reject_message ?? 'Balance failed'
			toast({ description, status: 'error' })
		}
	}, [ledgerActorPlug, toast])

	const getTransferIcpTx = (params, callback = () => {}) => ({
		idl: idlLedgerFactory,
		canisterId: ledgerCanisterId,
		methodName: 'send_dfx',
		args: [{
			to: params.accountId,
			fee: { e8s: isLocalhost(window.location.host) ? 0n : 10000n },
			amount: { e8s: params.amount },
			memo: 32n, // TODO: put random memo?
			from_subaccount: [],
			created_at_time: [],
		}],
		onSuccess: callback,
		onFail: (_res) => toast({ description: 'Something went wrong', status: 'error' })
	})

	const getUserBalance = useCallback(async () => {
		const _balance = await ledgerBalanceICP(parentCanisterId, userPrincipal)
		setBalance(_balance)
	}, [ledgerBalanceICP, userPrincipal])

	useEffect(() => {
		if (ledgerActorPlug) {
			getUserBalance()
		}
	}, [getUserBalance, ledgerActorPlug])

	const value = { balance, getTransferIcpTx, ledgerBalanceICP, loading, setLoading }

	return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export { LedgerContext, LedgerProvider }
