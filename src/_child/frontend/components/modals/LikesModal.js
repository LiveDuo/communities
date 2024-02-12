import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Text,Flex, Link } from '@chakra-ui/react'
import Jazzicon from 'react-jazzicon'
import { addressShort, getAddress, getSeedFromAuthentication, getAuthenticationType } from '../../utils/address'
import { useNavigate } from 'react-router-dom'

const LikesModal = ({ isOpen, onClose, likes, title }) => {
	const navigate = useNavigate()
	return (
		<Modal isOpen={isOpen} onClose={onClose} isCentered>
			<ModalOverlay />
			<ModalContent minW="520px">
				<ModalHeader>{title}</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					{likes.map((l, i) => (
						<Link href={`/user/${getAddress(l[1])}/${getAuthenticationType(l[1])}`} onClick={()=> navigate(`/user/${getAddress(l[1])}/${getAuthenticationType(l[1])}`)}>
							<Flex borderBottom={i < likes.length - 1 ? "1px solid #dcdedc" : 'none'} alignItems="center" paddingTop="10px" paddingBottom="10px">
								<Jazzicon diameter={20} seed={getSeedFromAuthentication(l[1])} />
								<Text ml="20px">{addressShort(getAddress(l[1]))}</Text>
							</Flex>
						</Link>
					))}
				</ModalBody>
			</ModalContent>
		</Modal>
	)
}
export default LikesModal
