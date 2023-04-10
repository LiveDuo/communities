import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Button, Textarea, Input } from '@chakra-ui/react'
import { useState } from 'react'

const PostModal = ({isOpen, onClose, createPost}) => {
	const [title, setTitle] = useState()
	const [description, setDescription] = useState()
	return (
		<Modal isOpen={isOpen} onClose={onClose} isCentered>
			<ModalOverlay />
			<ModalContent minW="600px">
				<ModalHeader>New Post</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<Input placeholder="Enter a title" mb="12px" onChange={(e) => setTitle(e.target.value)}/>
					<Textarea height="200px" placeholder="More details about the post" onChange={(e) => setDescription(e.target.value)}/>
				</ModalBody>
				<ModalFooter>
					<Button variant='ghost' mr="12px" onClick={onClose}>Close</Button>
					<Button variant="solid" onClick={() => {createPost(title, description); onClose()}}>Create</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
}
export default PostModal
