import { useContext, useCallback} from 'react'
import { IdentityContext } from '../store/identity'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Box } from '@chakra-ui/react'
import { Text, Button } from '@chakra-ui/react'


const IcoWalletModal = () =>  {
  
  const {connect, icWalletDisclosure, setWalletName} = useContext(IdentityContext)

  const selectWalletAndConnect = useCallback(async(wallet)=>{
    await connect(wallet)
    setWalletName(wallet)
    icWalletDisclosure.onClose()
  },[connect,setWalletName, icWalletDisclosure])

  return (
    <Modal isOpen={icWalletDisclosure.isOpen} onClose={icWalletDisclosure.onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Select Wallet</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Box m='8px' mb='20px'>
            <Text mb='20px'>
              Get the Plug Wallet extension for your browser.
            </Text>
              <Button onClick={()=> selectWalletAndConnect('plug')}>Plug</Button>
              <Button onClick={() => selectWalletAndConnect('infinityWallet')} ml="12px">InfinityWallet</Button>
          </Box> 
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default IcoWalletModal
