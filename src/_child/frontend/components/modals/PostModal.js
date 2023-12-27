import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Button, Input, Text, Box } from '@chakra-ui/react'
import Editor from '../Editor/Editor'
import ToolBar from '../Editor/ToolBar'
import Markdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import 'github-markdown-css/github-markdown-light.css'
import { useState, useRef } from 'react'

const PostModal = ({isOpen, onClose, createPost}) => {
	const [title, setTitle] = useState()
	const [description, setDescription] = useState()
	const [isPreview, setIsPreview] = useState(false)
	const textAreaRef = useRef()
	return (
		<Modal isOpen={isOpen} onClose={onClose} isCentered>
			<ModalOverlay />
			<ModalContent minW="600px">
				<ModalHeader>New Post</ModalHeader>
				<ModalCloseButton/>
				<ModalBody>
				<Input placeholder="Enter a title" mb="12px" onChange={(e) => setTitle(e.target.value)}/>
				{isPreview ? 
					<Box minH="200px" className='markdown-body'>
						{description?.length > 0  ? <Markdown rehypePlugins={[rehypeRaw, remarkGfm]} >{description}</Markdown> : <Text>Nothing to preview</Text>}
					</Box> 
					:
					 <Box>
						<ToolBar setContent={setDescription} textAreaRef={textAreaRef}/>
					 	<Editor content={description} setContent={setDescription} textAreaRef={textAreaRef} placeholder={"More details about the post"} style={{minHeight: '200px'}}/> 
					 </Box>
				}
				</ModalBody>
				<ModalFooter>
					<Button variant='ghost' mr="auto" onClick={() => setIsPreview((p) => !p)} >{!isPreview ? 'Preview' : 'Markdown'}</Button>
					<Button variant='ghost' mr="12px" onClick={()=> {onClose();setDescription()}}>Close</Button>
					<Button variant="solid" onClick={() => {createPost(title, description); onClose();setDescription()}}>Create</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	)
}
export default PostModal
