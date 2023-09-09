import { useState, useContext, createContext, useEffect, useCallback } from 'react'
import { useToast } from '@chakra-ui/react'

import { IdentityContext } from './identity'

const cmcCanisterId = process.env.REACT_APP_CMC_CANISTER_ID
export { cmcCanisterId }

const idlCmcFactory = ({ IDL }) => {
	const IcpXdrConversionRate = IDL.Record({
		'xdr_permyriad_per_icp': IDL.Nat64,
		'timestamp_seconds': IDL.Nat64,
	})
	const IcpXdrConversionRateCertifiedResponse = IDL.Record({
		'certificate': IDL.Vec(IDL.Nat8),
		'data': IcpXdrConversionRate,
		'hash_tree': IDL.Vec(IDL.Nat8),
	})
	const BlockIndex = IDL.Nat64
	const NotifyCreateCanisterArg = IDL.Record({
		'controller': IDL.Principal,
		'block_index': BlockIndex,
	})
	const NotifyError = IDL.Variant({
		'Refunded': IDL.Record({
			'block_index': IDL.Opt(BlockIndex),
			'reason': IDL.Text,
		}),
		'InvalidTransaction': IDL.Text,
		'Other': IDL.Record({
			'error_message': IDL.Text,
			'error_code': IDL.Nat64,
		}),
		'Processing': IDL.Null,
		'TransactionTooOld': BlockIndex,
	})
	const NotifyCreateCanisterResult = IDL.Variant({
		'Ok': IDL.Principal,
		'Err': NotifyError,
	})
	const NotifyTopUpArg = IDL.Record({
		'block_index': BlockIndex,
		'canister_id': IDL.Principal,
	})
	const Cycles = IDL.Nat
	const NotifyTopUpResult = IDL.Variant({ 'Ok': Cycles, 'Err': NotifyError })
	const SetAuthorizedSubnetworkListArgs = IDL.Record({
		'who': IDL.Opt(IDL.Principal),
		'subnets': IDL.Vec(IDL.Principal),
	})
	const ICPTs = IDL.Record({ 'e8s': IDL.Nat64 })
	const TransactionNotification = IDL.Record({
		'to': IDL.Principal,
		'to_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
		'from': IDL.Principal,
		'memo': IDL.Nat64,
		'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
		'amount': ICPTs,
		'block_height': IDL.Nat64,
	})
	const CyclesResponse = IDL.Variant({
		'Refunded': IDL.Tuple(IDL.Text, IDL.Opt(IDL.Nat64)),
		'CanisterCreated': IDL.Principal,
		'ToppedUp': IDL.Null,
	})
	const Result = IDL.Variant({ 'Ok': CyclesResponse, 'Err': IDL.Text })
	return IDL.Service({
		'get_average_icp_xdr_conversion_rate': IDL.Func([], [IcpXdrConversionRateCertifiedResponse], ['query']),
		'get_icp_xdr_conversion_rate': IDL.Func([], [IcpXdrConversionRateCertifiedResponse], ['query']),
		'notify_create_canister': IDL.Func([NotifyCreateCanisterArg], [NotifyCreateCanisterResult], []),
		'notify_top_up': IDL.Func([NotifyTopUpArg], [NotifyTopUpResult], []),
		'set_authorized_subnetwork_list': IDL.Func([SetAuthorizedSubnetworkListArgs], [], []),
		'transaction_notification': IDL.Func([TransactionNotification], [Result], []),
	})
}

const CmcContext = createContext()

const CmcProvider = ({ children }) => {

	const { walletConnected, createActor } = useContext(IdentityContext)
	
	const [cmcActor, setCmcActor] = useState(null)
	const [cyclesRate, setCyclesRate] = useState(null)
	const [loading, setLoading] = useState(false)

	const toast = useToast()

	const loadActor = useCallback(async () => {

		if (!cmcCanisterId) return
		const actor = await createActor({ canisterId: cmcCanisterId, interfaceFactory: idlCmcFactory })
		setCmcActor(actor)
	}, [createActor])
	
	useEffect(() => {
		if (walletConnected) {
			loadActor()
		}
	}, [loadActor, walletConnected])

	const getCyclesRate = async () => {

		try {
			const response = await cmcActor.get_icp_xdr_conversion_rate()
			const rate = Number(response.data.xdr_permyriad_per_icp)
			setCyclesRate(rate)
			return rate
		} catch (error) {
			const description = error.result?.reject_message ?? 'Cycles rate failed'
			toast({ description, status: 'error' })
		}
	}

	const value = { cyclesRate, getCyclesRate, loading, setLoading }

	return <CmcContext.Provider value={value}>{children}</CmcContext.Provider>
}

export { CmcContext, CmcProvider }
