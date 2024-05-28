import { useContext, useState } from 'react'

import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter } from '@chakra-ui/react'
import { Select, Text, Button, Link, Flex, InputGroup, InputLeftAddon, Input } from '@chakra-ui/react'

import { IdentityContext } from '../../store/identity'
// import { ChildContext } from '../../store/child'

const TopUpModal = () => {
	const [ amount, setAmount ] = useState(null)
	const { topUpDisclosure } = useContext(IdentityContext)

	const topupCanister = () => {
		console.log('topup')
	}
	
	return (
		<Modal isOpen={topUpDisclosure.isOpen} onClose={topUpDisclosure.onClose} isCentered>
			<ModalOverlay />
			<ModalContent maxW="520px">
				<ModalHeader>Top-up cycles</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<Text mb="20px">Add cycles to your community canister.</Text>
					<InputGroup ml="20px" mb="20px" width="50%">
						<InputLeftAddon>Amount</InputLeftAddon>
						<Select placeholder='Select value' onChange={(e) => setAmount(e.target.value)}>
							<option value={0.01}>0.01 ICP</option>
							<option value={0.1}>0.1 ICP</option>
							<option value={1}>1 ICP</option>
						</Select>
					</InputGroup>
					<Text><b>Note:</b> ICP coins are converted to cycles and transferred to the community canister.
						Learn more about cycles <Link color="ButtonText" href="https://internetcomputer.org/docs/current/developer-docs/cost-estimations-and-examples" isExternal>here</Link>.</Text>
				</ModalBody>
				<ModalFooter>
					<Button variant='ghost' mr="auto" onClick={()=> topUpDisclosure.onClose()}>Close</Button>
					<Button variant="solid" onClick={() => {topupCanister(); topUpDisclosure.onClose()}} isDisabled={!amount}>Transfer {amount} ICP</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
}
export default TopUpModal
