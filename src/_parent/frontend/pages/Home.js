import { useContext, useState } from 'react'
import { Box, Button, Link, Text, useToast } from '@chakra-ui/react'
import { ParentContext } from '../store/parent'
import { LedgerContext } from '../store/ledger'
import { IdentityContext } from '../store/identity'

import { ExternalLinkIcon } from '@chakra-ui/icons'

import { getPrincipalUrl } from '../utils/principal'

import { getAccountId } from '../utils/account'

const CREATE_CHILD_COST = 1 * 1e8

/* global BigInt */

const Home = () => {

	const { walletConnected, userPrincipal } = useContext(IdentityContext)
	const { parentCanisterId, loading, getCreateChildTx } = useContext(ParentContext)
	const { balance, getTransferIcpTx, ledgerCanisterId } = useContext(LedgerContext)
	const [childPrincipal, setChildPrincipal] = useState()
	const toast = useToast()
	
	const createChildBatch = async () => {
		const onTransfer = () => toast({ description: `Transfer success` })
		const onCreate = (r) => setChildPrincipal(r.Ok.toString())

		const accountId = getAccountId(parentCanisterId, userPrincipal)
		const transferTx = balance < CREATE_CHILD_COST ? [getTransferIcpTx({accountId, amount: BigInt(CREATE_CHILD_COST)}, onTransfer)] : []
		try {
			const txs = ledgerCanisterId ? [...transferTx, getCreateChildTx(null, onCreate)] : [getCreateChildTx(null, onCreate)]
			await window.ic.plug.batchTransactions(txs)
		} catch (error) {
			const description = error.message ?? 'Transaction failed'
			toast({ description, status: 'error' })
		}
	}

	if (!walletConnected) return <Text>Wallet not connected</Text>
	return (
		<Box m="20px">
			<Box mb="40px">
				<Button mb="8px" isLoading={loading} disabled={!balance && ledgerCanisterId} onClick={() => createChildBatch()}>Create Child</Button>
			</Box>
			<Box>
				<Box>{childPrincipal &&
					<Link href={getPrincipalUrl(childPrincipal)} isExternal>
						{childPrincipal} <ExternalLinkIcon mx='2px' />
					</Link>}
				</Box>
			</Box>
		</Box>
	)
}

export default Home
