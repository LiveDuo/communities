import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Button, Input } from '@chakra-ui/react'
import PostEditor from '../Editor/PostEditor'
import { useState } from 'react'

const PostModal = ({isOpen, onClose, createPost}) => {
	const [title, setTitle] = useState()
	const [description, setDescription] = useState()
	const [isPreview, setIsPreview] = useState(false)
	return (
		<Modal isOpen={isOpen} onClose={onClose} isCentered>
			<ModalOverlay />
			<ModalContent minW="600px">
				<ModalHeader>New Post</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
				<Input placeholder="Enter a title" mb="12px" onChange={(e) => setTitle(e.target.value)}/>
				<PostEditor description={description} setDescription={setDescription} isPreview={isPreview}/>
				</ModalBody>
				<ModalFooter>
					<Button variant='ghost' mr="auto" onClick={() => setIsPreview((p) => !p)} >{!isPreview ? 'Preview' : 'Markdown'}</Button>
					<Button variant='ghost' mr="12px" onClick={onClose}>Close</Button>
					<Button variant="solid" onClick={() => {createPost(title, description); onClose()}}>Create</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
}
export default PostModal
