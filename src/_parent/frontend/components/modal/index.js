import { useContext } from 'react'
import { IdentityContext } from '../../store/identity'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,} from '@chakra-ui/react'
import {Text, Link} from '@chakra-ui/react'
const BasicUsage = () =>  {
  const {isOpen, onClose} = useContext(IdentityContext)
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Download Plug Wallet</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text mb='1rem'>
            Pleas Download Plug Wallet
          </Text>
          <Link href='https://plugwallet.ooo/' isExternal>
              plugwallet.ooo
          </Link>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default BasicUsage