import { useState, useEffect, createContext, useCallback, useContext } from 'react'

import { useToast } from '@chakra-ui/react'

import { IdentityContext } from './identity'
import { LedgerContext, ledgerCanisterId } from './ledger'

import { getAccountId } from '../utils/account'
import { isLocal } from '../utils/url'

export const parentCanisterId = process.env.REACT_APP_PARENT_CANISTER_ID

const CREATE_CHILD_COST = 1 * 1e8

/* global BigInt */

const idlParentFactory = ({ IDL }) => {

	const canisterState = IDL.Variant({ Preparing: IDL.Null, Creating: IDL.Null, Installing: IDL.Null, Uploading: IDL.Null, Authorizing: IDL.Null, Ready: IDL.Null })
	const canisterData = IDL.Record({ id: IDL.Opt(IDL.Principal), timestamp: IDL.Nat64, state: canisterState, })

	return IDL.Service({
		'get_user_canisters': IDL.Func([], [IDL.Vec(canisterData)], ['query']),
		'create_child': IDL.Func([], [IDL.Variant({ Ok: IDL.Principal, Err: IDL.Text })], []),
	})
}

const ParentContext = createContext()

const ParentProvider = ({ children }) => {

	const toast = useToast()

	const { walletConnected, walletDetected, createActor, userPrincipal, batchTransactions, walletDisclosure } = useContext(IdentityContext)
	const { userBalance, getTransferIcpTx } = useContext(LedgerContext)

	const [parentActor, setParentActor] = useState(null)
	const [userCommunities, setUserCommunities] = useState(null)
	const [loading, setLoading] = useState(false)
	// const [parentActorAnonymous, setParentActorAnonymous] = useState(null)

	const loadActor = useCallback(async () => {

		// const actorOptions = { agent: getAgent(null), canisterId: parentCanisterId, host: icHost }
		// const actorAnonymous = Actor.createActor(idlParentFactory, actorOptions)
		// setParentActorAnonymous(actorAnonymous)

		const actorWallet = await createActor({ canisterId: parentCanisterId, interfaceFactory: idlParentFactory })
		setParentActor(actorWallet)
	}, [createActor])
	
	useEffect(() => {
		if (walletConnected) {
			loadActor()
		}
	}, [loadActor, walletConnected])

	// const createChild = async () => {
	// 	setLoading(true)
	// 	const {Ok: childPrincipal} = await parentActorAnonymous.create_child()
	// 	setLoading(false)
	// 	return childPrincipal
	// }

	// const callCreateCanister = async () => {
	// 	try {
	// 		const response = await parentActor.create_child()
	// 		if (response.Ok) {
	// 			toast({ description: `Response: ${response.Ok}` })
	// 		} else {
	// 			toast({ description: `Response: ${response.Err}`, status: 'error' })
	// 		}
	// 	} catch (error) {
	// 		const description = error.result?.reject_message ?? 'Response failed'
	// 		toast({ description, status: 'error' })
	// 	}
	// }

	const getCreateChildTx = (_params, callback = () => {}) => ({
		idl: idlParentFactory,
		canisterId: parentCanisterId,
		methodName: 'create_child',
		args: [],
		onSuccess: callback,
		onFail: (_res) => toast({ description: 'Something went wrong', status: 'error' })
	})

	const createUserCommunity = async () => {
    	if (!walletDetected || !walletConnected) {
			walletDisclosure.onOpen()
			return
		}

		const interval = setInterval(() => getUserCommunities(), !isLocal ? 5000 : 1000)

		const onTransfer = () => toast({ description: `Transfer success` })
		const onCreate = () => toast({ description: `Created canister` })

		const accountId = getAccountId(parentCanisterId, userPrincipal)
		const transferTx = getTransferIcpTx({accountId, amount: BigInt(CREATE_CHILD_COST)}, onTransfer)
		const createChildTx = getCreateChildTx(null, onCreate)
		try {
			const txs = ledgerCanisterId ? [...userBalance < CREATE_CHILD_COST ? [transferTx] : [], createChildTx] : [createChildTx]
			await batchTransactions(txs)
		} catch (error) {
			const description = error.message ?? 'Transaction failed'
			toast({ description, status: 'error' })
		}

		clearInterval(interval)
	}

	const getUserCommunities = useCallback(async () => {
		try {
			const response = await parentActor.get_user_canisters()
			const canisters = response.map((c) => {
				const canisterId = c.id.length > 0 ? c.id[0].toString() : ''
				return {
					id: canisterId,
					timestamp: new Date(Number(c.timestamp / 1000n / 1000n)),
					state: Object.keys(c.state)[0],
				}
			})
			setUserCommunities(canisters)
		} catch (error) {
			const description = error.result?.reject_message ?? 'Response failed'
			toast({ description, status: 'error' })
		}
	}, [toast, parentActor])

	useEffect(() => {
		if (parentActor)
			getUserCommunities()
	}, [parentActor, getUserCommunities])

	const value = { createUserCommunity, userCommunities, loading, setLoading }

	return <ParentContext.Provider value={value}>{children}</ParentContext.Provider>
}

export { ParentContext, ParentProvider }
