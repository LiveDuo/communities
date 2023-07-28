import { useContext, useCallback} from 'react'

import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Flex, Button, Text, Image } from '@chakra-ui/react'

import { IdentityContext } from '../../store/identity'
import { ChildContext } from '../../store/child'

import PlugLogo from '../../logos/plug.png'
import BitfinityLogo from '../../logos/bitfinity.png'

const IcWalletModal = () =>  {
  // TODO: isWalletDetected
  const {icWalletDisclosure, setWalletIcName} = useContext(IdentityContext)
  const {login} = useContext(ChildContext)

  const selectWalletAndConnect = useCallback(async(wallet)=>{
    await login('ic', wallet)
    setWalletIcName(wallet)
    icWalletDisclosure.onClose()
  },[setWalletIcName, icWalletDisclosure, login])

  return (
    <Modal isOpen={icWalletDisclosure.isOpen} onClose={icWalletDisclosure.onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Select a wallet</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex flexDir="column" m='8px' mb='32px'>
            <Text mb='20px'>Pick an Internet Computer wallet to connect.</Text>
            <Button size="lg" mb="12px" isDisabled={!window?.ic?.plug} leftIcon={<Image src={PlugLogo} width={8} />} onClick={()=> selectWalletAndConnect('plug')}>Plug Wallet</Button>
            <Button size="lg" isDisabled={!window?.ic?.infinityWallet} leftIcon={<Image src={BitfinityLogo} width={5} />} onClick={() => selectWalletAndConnect('infinityWallet')}>Infinity Wallet</Button>
          </Flex> 
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default IcWalletModal
