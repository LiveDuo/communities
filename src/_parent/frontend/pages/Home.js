import { useContext } from 'react'
import { Box, Button, Link, Text, useToast } from '@chakra-ui/react'
import { ParentContext } from '../store/parent'
import { LedgerContext } from '../store/ledger'
import { IdentityContext } from '../store/identity'

import { ExternalLinkIcon } from '@chakra-ui/icons'

import { getPrincipalUrl } from '../utils/principal'

import { getAccountId } from '../utils/account'

const CREATE_CHILD_COST = 1 * 1e8

const Example = () => {

	const { walletConnected, userPrincipal } = useContext(IdentityContext)
	const { childPrincipal, parentCanisterId, loading, getCreateChildTx } = useContext(ParentContext)
	const { balance, getTransferIcpTx } = useContext(LedgerContext)
	const toast = useToast()
	
	const createChildBatch = async () => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		const transferTx = balance < CREATE_CHILD_COST ? [getTransferIcpTx({accountId, amount: 100000000n})] : []
		try {
			await window.ic.plug.batchTransactions([...transferTx, getCreateChildTx()])
		} catch (error) {
			const description = error.message ?? 'Transaction failed'
			toast({ description, status: 'error' })
		}
	}

	if (!walletConnected) return <Text>Wallet not connected</Text>
	return (
		<Box m="20px">
			<Box mb="20px">
				{balance > 0 && <Text>User Balance: {balance / 1e8} ICP</Text>}
			</Box>
			<Box>
				<Button mb="8px" isLoading={loading} disabled={!balance} onClick={() => createChildBatch()}>Create Child</Button>
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

export default Example
