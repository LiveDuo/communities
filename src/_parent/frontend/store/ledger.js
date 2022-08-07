import { useState, useContext, createContext } from 'react'
import { useToast } from '@chakra-ui/react'

import { IdentityContext } from './identity'

import { getAccountId } from '../utils/account'

import { idlLedgerFactory, ledgerCanisterId } from '../agents/ledger'

const LedgerContext = createContext()

const LedgerProvider = ({ children }) => {

	const toast = useToast()
	const [loading, setLoading] = useState()
	const { ledgerActorPlug } = useContext(IdentityContext)

	const ledgerBalanceICP = async (parentCanisterId, userPrincipal) => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		try {
			const response = await ledgerActorPlug.account_balance_dfx({ account: accountId })
			return Number(response.e8s)
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

	const value = { getTransferIcpTx, ledgerBalanceICP, loading, setLoading }

	return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export { LedgerContext, LedgerProvider }
