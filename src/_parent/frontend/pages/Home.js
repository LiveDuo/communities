import { useContext, useState, useEffect } from 'react'
import { Box, Button, Link, Text, useToast, Flex, Spinner, Tag, Heading } from '@chakra-ui/react'
import { Table, Thead, Tbody, Tr, Th, Td, TableCaption, TableContainer, } from '@chakra-ui/react'
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'

import { ParentContext } from '../store/parent'
import { LedgerContext } from '../store/ledger'
import { IdentityContext } from '../store/identity'

import { ExternalLinkIcon } from '@chakra-ui/icons'

import { getPrincipalUrl } from '../utils/principal'

import { getAccountId } from '../utils/account'
import { timeSince } from '../utils/time'

import { isLocal } from '../agents'

const CREATE_CHILD_COST = 1 * 1e8

/* global BigInt */

const Home = () => {

	const { walletConnected, userPrincipal, parentActorPlug } = useContext(IdentityContext)
	const { parentCanisterId, loading, getCreateChildTx, getUserCanisters } = useContext(ParentContext)
	const { balance, getTransferIcpTx, ledgerCanisterId } = useContext(LedgerContext)
	const [childPrincipals, setChildPrincipals] = useState()
	const toast = useToast()
	
	const getStateColor = (state) => {
		if (state === 'Preparing') return 'green'
		else if (state === 'Creating') return 'orange'
		else if (state === 'Installing') return 'pink'
		else if (state === 'Uploading') return 'blue'
		else if (state === 'Ready') return 'purple'
	}

	const createChildBatch = async () => {
		const onTransfer = () => toast({ description: `Transfer success` })
		
		const onCreate = (result) => {
			const canister = {id: result.Ok.toString(), timestamp: 'u64', state: 'Ready'}
			setChildPrincipals(r => (r.some(c => c.id[0] === canister.id)) ? r : [...r, canister])
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

	if (!walletConnected) return <Text>Wallet not connected</Text>
	return (
		<Box>
			<Tabs m="0 auto" maxW="1120px" borderWidth="1px" borderRadius="lg" variant="soft-rounded" colorScheme="gray">
			<TabList p="20px" borderBottomWidth="1px">
				<Tab>New Community</Tab>
				<Tab>User Communities</Tab>
			</TabList>
			<TabPanels p="20px">
				<TabPanel>
					<Flex p="20px">
						<Box flex={1}>
							<img src={require('../public/launch.jpg')} alt="get started communities" width={400}/>
						</Box>
						<Flex flex={1} flexDir="column" justifyContent="center" alignItems="center">
							<Heading size="sm" mb="8px">Join & Grow</Heading>
							<Heading size="lg" mb="16px">Launch a community</Heading>
							<Text mb="8px" >✓ Running completely on the Internet Computer</Text>
							<Text mb="8px"> ✓ Supports Ethereum & Solana authentication </Text>
							<Text mb="24px"> ✓ One click deploy to user wallet</Text>
							<Button mb="8px" isLoading={loading} disabled={!balance && ledgerCanisterId} onClick={() => createChildBatch()}>Get Started</Button>
						</Flex>
					</Flex>
				</TabPanel>
				<TabPanel>
					<Box>
						{/* <Heading size={'lg'} mb="20px">Communities</Heading> */}
						{childPrincipals ? 
							childPrincipals?.length > 0 ? <TableContainer>
								<Table variant='simple'>
									<TableCaption>Communities corresponding to <b>{userPrincipal.slice(0, 5)}...{userPrincipal.slice(-3)}</b></TableCaption>
									<Thead>
										<Tr>
											<Th>State</Th>
											<Th>Canister</Th>
											<Th>Created At</Th>
										</Tr>
									</Thead>
									<Tbody>
									{childPrincipals?.map((canister, i) => 
										<Tr key={i}>
											<Td><Tag colorScheme={getStateColor(canister.state)}>{canister.state}</Tag></Td>
											<Td><Link href={getPrincipalUrl(canister.id)} isExternal>
												{canister.id} <ExternalLinkIcon mx='2px' />
											</Link></Td>
											<Td><Text>{timeSince(canister.timestamp)}</Text></Td>
										</Tr>)}
									</Tbody>
								</Table>
							</TableContainer> : 
							<Text>No canisters yet</Text> : 
						<Spinner/>}
					</Box>
				</TabPanel>
			</TabPanels>
			</Tabs>
		</Box>
	)
}

export default Home
