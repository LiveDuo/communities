import { useContext, useState } from 'react'

import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter } from '@chakra-ui/react'
import { Select, Text, Button, Link, InputGroup, InputLeftAddon, useToast } from '@chakra-ui/react'

import { IdentityContext } from '../../store/identity'
import { CHILD_CANISTER_ID } from '../../store/child'
import { LedgerContext, ledgerCanisterId } from '../../store/ledger'
import { cmcCanisterId, CmcContext } from '../../store/cmc'

import { getAccountId } from '../../utils/account'
import { Principal } from '@dfinity/principal'

/* global BigInt */
const MINT_MEMO = 1347768404n;

const TopUpModal = () => {
	const [ amount, setAmount ] = useState(null)
	const { topUpDisclosure, batchTransactions } = useContext(IdentityContext)
	const { getTransferIcpTx } = useContext(LedgerContext)
	const { cmcActor } = useContext(CmcContext)
	const toast = useToast()

	const topupCanister = async () => {
		const accountId = getAccountId(cmcCanisterId, CHILD_CANISTER_ID)
		const transferTx = getTransferIcpTx({accountId, amount: BigInt(+amount * 10 **8), memo: MINT_MEMO}, async (blockIndex) => {	
			await cmcActor.notify_top_up({ block_index: blockIndex, canister_id: Principal.fromText(CHILD_CANISTER_ID) })
			toast({description: "Top up success", status: 'success'})
		})
		try {
			const txs = ledgerCanisterId ? [transferTx] : []
			await batchTransactions(txs)
		} catch (error) {
			const description = error.message ?? 'Transaction failed'
			toast({ description, status: 'error' })
		}
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
					<Button variant="solid" onClick={() => {topupCanister(); topUpDisclosure.onClose(); setAmount(null)}} isDisabled={!amount}>Transfer {amount} ICP</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
}
export default TopUpModal
