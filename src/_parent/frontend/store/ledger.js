import { useState, useContext, createContext, useEffect, useCallback } from 'react'
import { useToast } from '@chakra-ui/react'

import { IdentityContext } from './identity'

import { getAccountId } from '../utils/account'

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

	const { userPrincipal, walletConnected, createActor } = useContext(IdentityContext)
	
	const [ledgerActor, setLedgerActor] = useState(null)
	const [userBalance, setUserBalance] = useState(null)
	const [loading, setLoading] = useState(false)

	const toast = useToast()

	const loadActor = useCallback(async () => {

		if (!ledgerCanisterId) return
		const actor = await createActor({ canisterId: ledgerCanisterId, interfaceFactory: idlLedgerFactory })
		setLedgerActor(actor)
	}, [createActor])
	
	useEffect(() => {
		if (walletConnected) {
			loadActor()
		}
	}, [loadActor, walletConnected])

	const getTransferIcpTx = (params, callback = () => {}) => ({
		idl: idlLedgerFactory,
		canisterId: ledgerCanisterId,
		methodName: 'send_dfx',
		args: [{
			to: params.accountId,
			fee: { e8s: ledgerCanisterId ? 10000n :  0n },
			amount: { e8s: params.amount },
			memo: 32n, // TODO: put random memo?
			from_subaccount: [],
			created_at_time: [],
		}],
		onSuccess: callback,
		onFail: (error) => toast({ description: error.result?.reject_message ?? 'Something went wrong', status: 'error' })
	})

	const getUserBalance = useCallback(async () => {
		const accountId = getAccountId(userPrincipal)
		try {
			const response = await ledgerActor.account_balance_dfx({ account: accountId })
			setUserBalance(Number(response.e8s))
		} catch (error) {
			const description = error.result?.reject_message ?? 'Balance failed'
			toast({ description, status: 'error' })
		}
	}, [ledgerActor, toast, userPrincipal])

	useEffect(() => {
		if (ledgerActor) {
			getUserBalance()
		}
	}, [getUserBalance, ledgerActor])

	const value = { userBalance, getTransferIcpTx, loading, setLoading }

	return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export { LedgerContext, LedgerProvider }
