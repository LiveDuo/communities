import { createContext } from 'react'
import { useToast } from '@chakra-ui/react'

const ledgerCanisterId = process.env.REACT_APP_LEDGER_CANISTER_ID
export { ledgerCanisterId }

const idlLedgerFactory = ({ IDL }) => {
	const SendArgs = IDL.Record({
		'to': IDL.Text,
		'fee': IDL.Record({ 'e8s': IDL.Nat64 }),
		'memo': IDL.Nat64,
		'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
		'created_at_time': IDL.Opt(IDL.Record({ 'timestamp_nanos': IDL.Nat64 })),
		'amount': IDL.Record({ 'e8s': IDL.Nat64 }),
	})
	const BalanceArgs = IDL.Record({ 'account': IDL.Text })
	return IDL.Service({
		'account_balance_dfx': IDL.Func([BalanceArgs], [IDL.Record({ 'e8s': IDL.Nat64 })], ['query']),
		'account_balance': IDL.Func([IDL.Vec(IDL.Nat8)], [IDL.Record({ 'e8s': IDL.Nat64 })], ['query']),
		'send_dfx': IDL.Func([SendArgs], [IDL.Nat64], []),
	})
}

const LedgerContext = createContext()

const LedgerProvider = ({ children }) => {
	const toast = useToast()

	const getTransferIcpTx = (params, callback = () => {}) => ({
		idl: idlLedgerFactory,
		canisterId: ledgerCanisterId,
		methodName: 'send_dfx',
		args: [{
			to: params.accountId,
			fee: { e8s: ledgerCanisterId ? 10000n :  0n },
			amount: { e8s: params.amount },
			memo: params.memo,
			from_subaccount: [],
			created_at_time: [],
		}],
		onSuccess: callback,
		onFail: (error) => toast({ description: error.message ?? 'Something went wrong', status: 'error' })
	})

	const value = { getTransferIcpTx }

	return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export { LedgerContext, LedgerProvider }
