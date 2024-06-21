import { useContext } from 'react'
import { Box, Text, Spinner, Tag, Link, Button, Flex} from '@chakra-ui/react'
import { TableContainer, Table, TableCaption, Thead, Tr, Th, Tbody, Td} from '@chakra-ui/react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'

import { timeSince } from '../utils/time'
import { getPrincipalUrl } from '../utils/principal'

import { IdentityContext } from '../store/identity'
import { ParentContext } from '../store/parent'


const UserCommunities = () => {

	const { userPrincipal } = useContext(IdentityContext)
	const { createUserCommunity, userCommunities } = useContext(ParentContext)

	const getStateColor = (state) => {
		if (state === 'Preparing') return 'green'
		else if (state === 'Creating') return 'orange'
		else if (state === 'Installing') return 'pink'
		else if (state === 'Uploading') return 'blue'
		else if (state === 'Authorizing') return 'cyan'
		else if (state === 'Ready') return 'purple'
	}

	return (
		<Box  p="20px 0px">
			{userCommunities ? 
				userCommunities?.length > 0 ?
					<>
						<Flex marginBottom="10px">
							<Button marginLeft="auto" marginRight="20px" colorScheme="green" size="sm" onClick={createUserCommunity}>Deploy Community</Button>
						</Flex>
						<TableContainer>
							<Table variant='simple'>
								<TableCaption>Communities created by <b>{userPrincipal.slice(0, 5)}...{userPrincipal.slice(-3)}</b></TableCaption>
								<Thead>
									<Tr>
										<Th>State</Th>
										<Th>Canister</Th>
										<Th>Created At</Th>
									</Tr>
								</Thead>
								<Tbody>
								{userCommunities?.map((canister, i) => 
									<Tr key={i}>
										<Td><Tag colorScheme={getStateColor(canister.state)}>{canister.state}</Tag></Td>
										<Td><Link href={getPrincipalUrl(canister.id)} isExternal>
											{canister.id} <FontAwesomeIcon icon={faArrowUpRightFromSquare} size='sm'/>
										</Link></Td>
										<Td><Text>{timeSince(canister.timestamp)}</Text></Td>
									</Tr>)}
								</Tbody>
							</Table>
						</TableContainer> 
					</> :
				<Text>No canisters yet</Text> : 
			<Spinner/>}
		</Box>
	)
}

export default UserCommunities