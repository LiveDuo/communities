import { useContext, useEffect, useCallback, useState } from 'react'
import { Box, Button, Link, Text, useToast } from '@chakra-ui/react'
import { ParentContext } from '../store/parent'
import { LedgerContext } from '../store/ledger'
import { IdentityContext } from '../store/identity'

import { ExternalLinkIcon } from '@chakra-ui/icons'

import { getPrincipalUrl } from '../utils/principal'

import { getAccountId } from '../utils/account'

const Example = () => {

	const { walletConnected, userPrincipal, ledgerActorPlug } = useContext(IdentityContext)
	const { childPrincipal, parentCanisterId, loading, getCreateChildTx } = useContext(ParentContext)
	const { ledgerBalanceICP, getTransferIcpTx } = useContext(LedgerContext)
	const [balance, setBalance] = useState(null)
	const toast = useToast()
	
	const createChildBatch = async () => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		const transferTx = balance > 0 ? [getTransferIcpTx({accountId, amount: 100000000n})] : []
		try {
			await window.ic.plug.batchTransactions([...transferTx, getCreateChildTx()])
		} catch (error) {
			const description = error.message ?? 'Transaction failed'
			toast({ description, status: 'error' })
		}
	}

	const getAdminBalance = useCallback(async () => {
		const _balance = await ledgerBalanceICP(parentCanisterId, userPrincipal)
		setBalance(_balance)
	}, [ledgerBalanceICP, parentCanisterId, userPrincipal])

	useEffect(() => {
		if (ledgerActorPlug) {
			getAdminBalance()
		}
	}, [getAdminBalance, ledgerActorPlug])

	if (!walletConnected) return <Text>Wallet not connected</Text>
	return (
		<Box m="20px">
			<Box mb="20px">
				{balance > 0 && <Text>User Balance: {balance / 1e8} ICP</Text>}
			</Box>
			<Box>
				<Button mb="8px" isLoading={loading} onClick={() => createChildBatch()}>Create Child</Button>
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
