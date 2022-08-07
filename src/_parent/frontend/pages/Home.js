import { useContext } from 'react'
import { Box, Button, Link, Text } from '@chakra-ui/react'
import { ParentContext } from '../store/parent'
import { LedgerContext } from '../store/ledger'
import { IdentityContext } from '../store/identity'

import { ExternalLinkIcon } from '@chakra-ui/icons'

import { getPrincipalUrl } from '../utils/principal'

import { getAccountId } from '../utils/account'

const Example = () => {

	const { walletConnected, userPrincipal } = useContext(IdentityContext)
	const { createChild, childPrincipal, parentCanisterId, callCreateCanister, loading, getCreateChildTx } = useContext(ParentContext)
	const { callAdminBalance, requestTransferICP, requestBalanceICP, ledgerTransferICP, ledgerBalanceICP, getTransferIcpTx } = useContext(LedgerContext)

	const createChildBatch = async () => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		await window.ic.plug.batchTransactions([getTransferIcpTx({accountId, amount: 100000000n}), getCreateChildTx()])
	}

	return (
		<Box m="20px">
			<Box mb="20px">
				<Button onClick={() => requestTransferICP(parentCanisterId, userPrincipal)} disabled={!walletConnected}>Request Transfer ICP</Button>
				<Button ml="8px" onClick={() => requestBalanceICP()} disabled={!walletConnected}>Request Balance ICP</Button>
				<Text as="span">&nbsp; ← Looks like they not working for localhost</Text>
			</Box>
			<Box mb="20px">
				<Button onClick={() => ledgerTransferICP(parentCanisterId, userPrincipal)} disabled={!walletConnected}>Ledger Transfer ICP</Button>
				<Button ml="8px" onClick={() => ledgerBalanceICP(parentCanisterId, userPrincipal)} disabled={!walletConnected}>Ledger Balance ICP</Button>
				<Text as="span">&nbsp; ← Not throwing correct errors if ledger canister not found</Text>
			</Box>
			<Box mb="20px">
				<Button onClick={callCreateCanister} disabled={!walletConnected}>Call Create Canister</Button>
				<Button ml="8px" onClick={() => callAdminBalance(parentCanisterId)} disabled={!walletConnected}>Call Admin Balance</Button>
				<Button ml="8px" onClick={() => createChildBatch()}>Create Child (batch)</Button>
			</Box>

			<Box mt="140px">
				<Button isLoading={loading} loadingText='Creating...' onClick={createChild}>Create Child</Button>
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
