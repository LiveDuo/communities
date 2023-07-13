import { useContext, useState, useEffect } from 'react'
import { Box, useToast} from '@chakra-ui/react'

import { ParentContext } from '../store/parent'
import { LedgerContext } from '../store/ledger'
import { IdentityContext } from '../store/identity'

import { getAccountId } from '../utils/account'

import { isLocal } from '../agents'

import OnBoarding from '../components/OnBoarding'
import UserCommunities from '../components/UserCommunities'

const CREATE_CHILD_COST = 1 * 1e8

/* global BigInt */

const Home = () => {

	const { walletConnected, userPrincipal, parentActorPlug, modalDisclosure, loadPlug } = useContext(IdentityContext)
	const { parentCanisterId, getCreateChildTx, getUserCanisters } = useContext(ParentContext)
	const { balance, getTransferIcpTx, ledgerCanisterId } = useContext(LedgerContext)
	const [childPrincipals, setChildPrincipals] = useState([])

	const toast = useToast()

	const createChildBatch = async () => {
    	if (!window.ic?.plug || !walletConnected) {
			modalDisclosure.onOpen()
			return
		}
		const onTransfer = () => toast({ description: `Transfer success` })
		
		const onCreate = (result) => {
			const canister = {id: result.Ok.toString(), timestamp: 'u64', state: 'Ready'}
			setChildPrincipals(r => (r.some(c => c.id[0] === canister.id)) ? r : [...r, canister])
			toast({ description: `Created canister` })
		}

		const interval = setInterval(() => getUserCanisters().then(c => setChildPrincipals(c)), !isLocal ? 5000 : 1000)

		const accountId = getAccountId(parentCanisterId, userPrincipal)
		const transferTx = balance < CREATE_CHILD_COST ? [getTransferIcpTx({accountId, amount: BigInt(CREATE_CHILD_COST)}, onTransfer)] : []
		try {
			const txs = ledgerCanisterId ? [...transferTx, getCreateChildTx(null, onCreate)] : [getCreateChildTx(null, onCreate)]
			await window.ic.plug.batchTransactions(txs)
		} catch (error) {
			const description = error.message ?? 'Transaction failed'
			toast({ description, status: 'error' })
		}

		clearInterval(interval)
	}

	useEffect(() => {
		if (parentActorPlug)
			getUserCanisters().then(canisters => setChildPrincipals(canisters))
	}, [parentActorPlug, getUserCanisters])

	useEffect(()=>{
		if (window.ic?.plug) {
			loadPlug()
		}
	},[loadPlug])

	return (
		<Box>
			<Box m="0 auto" maxW="1120px" borderWidth="1px" borderRadius="lg" variant="soft-rounded">
				{childPrincipals.length > 0 ? <UserCommunities childPrincipals={childPrincipals}/> : <OnBoarding createChildBatch={createChildBatch}/> }
			</Box>
		</Box>
	)
}

export default Home
