import { useContext, useEffect, useState, useCallback } from 'react'

import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Button, Text, Box, Tag, Flex, Heading, Spinner, useToast } from '@chakra-ui/react'

import { IdentityContext } from '../../store/identity'
import { ChildContext } from '../../store/child'

const TopUpModal = () => {
	const { topUpDisclosure } = useContext(IdentityContext)
	return (
		<Modal isOpen={topUpDisclosure.isOpen} onClose={topUpDisclosure.onClose} isCentered>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader>Top-up</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
				</ModalBody>
			</ModalContent>
		</Modal>
	)
}
export default TopUpModal
