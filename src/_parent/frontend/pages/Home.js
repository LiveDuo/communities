import { useContext } from 'react'
import { Box, Button, Link, Text, useToast } from '@chakra-ui/react'
import { ParentContext } from '../store/parent'
import { IdentityContext } from '../store/identity'

import { ExternalLinkIcon } from '@chakra-ui/icons'

import { getAccountId } from '../utils/account'
import { icHost } from '../agents'
import { ledgerCanisterId, idlLedgerFactory } from '../agents/ledger'
import { parentCanisterId, idlParentFactory } from '../agents/parent'

const transferAmount = 0.5

const getPrincipalUrl = (childPrincipal) => {
	if (process.env.REACT_APP_ICP_ENV !== 'production')
		return `http://${icHost}/?canisterId=${childPrincipal}`
	else
		return `https://${childPrincipal}.${icHost}/`
}

const Example = () => {

	const toast = useToast()
	const { walletConnected, userPrincipal } = useContext(IdentityContext)
	const { createChild, childPrincipal, loading } = useContext(ParentContext)

	const requestTransferICP = async () => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		const transferParams = { to: accountId, amount: transferAmount * 1e8 }
		try {
			await window.ic?.plug?.requestTransfer(transferParams)
			toast({ description: `Transfer success` })
		} catch (error) {
			toast({ description: 'Transfer failed', status: "error" })
		}
	}

	const requestBalanceICP = async () => {
		try {
			const requestBalanceResponse = await window.ic?.plug?.requestBalance()
			const balance = requestBalanceResponse.find(c => c.symbol === 'ICP').amount
			toast({ description: `Balance: ${balance} ICP` })
		} catch (error) {
			toast({ description: 'Balance failed', status: 'error' })
		}
	}

	const ledgerTransferICP = async () => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		const actor = await window.ic.plug.createActor({ canisterId: ledgerCanisterId, interfaceFactory: idlLedgerFactory })
		const sendParams = {
			to: accountId, fee: { e8s: 0n },
			amount: { e8s: transferAmount * 1e8 }, memo: 0, from_subaccount: [], created_at_time: []
		}
		try {
			await actor.send_dfx(sendParams)
			toast({ description: 'Transfer success' })
		} catch (error) {
			toast({ description: 'Transfer failed' })
		}
	}

	const ledgerBalanceICP = async () => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		const actor = await window.ic.plug.createActor({ canisterId: ledgerCanisterId, interfaceFactory: idlLedgerFactory })
		try {
			const response = await actor.account_balance_dfx({ account: accountId })
			toast({ description: `Balance: ${Number(response.e8s) / 1e8} ICP` })
		} catch (error) {
			const description = error.result?.reject_message ?? 'Balance failed'
			toast({ description, status: 'error' })
		}
	}

	const callCreateCanister = async () => {
		const nssActor = await window.ic?.plug?.createActor({ canisterId: parentCanisterId, interfaceFactory: idlParentFactory })
		try {
			const response = await nssActor.create_canister()
			if (response.Ok) {
				toast({ description: `Response: ${response.Ok}` })
			} else {
				toast({ description: `Response: ${response.Err}`, status: 'error' })
			}
		} catch (error) {
			const description = error.result?.reject_message ?? 'Response failed'
			toast({ description, status: 'error' })
		}
	}

	const callAdminBalance = async () => {
		const accountId = getAccountId(parentCanisterId)
		const actor = await window.ic.plug.createActor({ canisterId: ledgerCanisterId, interfaceFactory: idlLedgerFactory })
		try {
			const response = await actor.account_balance_dfx({ account: accountId })
			toast({ description: `Balance: ${Number(response.e8s) / 1e8} ICP` })
		} catch (error) {
			console.error()
			const description = error.result?.reject_message ?? 'Balance failed'
			toast({ description, status: 'error' })
		}
	}

	// eslint-disable-next-line
	const printDebug = () => {
		const accountId = getAccountId(parentCanisterId, userPrincipal)
		toast({ description: `${parentCanisterId}, ${userPrincipal}, ${accountId}` })
	}

	return (
		<Box m="20px">
			<Box mb="20px">
				<Button onClick={requestTransferICP} disabled={!walletConnected}>Request Transfer ICP</Button>
				<Button ml="8px" onClick={requestBalanceICP} disabled={!walletConnected}>Request Balance ICP</Button>
				<Text as="span">&nbsp; ← Looks like they not working for localhost</Text>
			</Box>
			<Box mb="20px">
				<Button onClick={ledgerTransferICP} disabled={!walletConnected}>Ledger Transfer ICP</Button>
				<Button ml="8px" onClick={ledgerBalanceICP} disabled={!walletConnected}>Ledger Balance ICP</Button>
				<Text as="span">&nbsp; ← Not throwing correct errors if ledger canister not found</Text>
			</Box>
			<Box mb="20px">
				<Button onClick={callCreateCanister} disabled={!walletConnected}>Call Create Canister</Button>
				<Button ml="8px" onClick={callAdminBalance} disabled={!walletConnected}>Call Admin Balance</Button>
				{/* <Button ml="8px" onClick={printDebug} disabled={!walletConnected}>Debug</Button> */}
			</Box>

			<Box mt="140px">
				<Button isLoading={loading} loadingText='Creating...' mb="20px" onClick={createChild}>Create Child</Button>
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
