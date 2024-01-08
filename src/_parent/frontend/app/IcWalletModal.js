// import React from 'react'
import { useContext, useCallback} from 'react'

import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Flex, Button, Text, Image } from '@chakra-ui/react'

import { IdentityContext } from '../store/identity'

import PlugLogo from '../logos/plug.png'
import BitfinityLogo from '../logos/bitfinity.png'

const IcWalletModal = () =>  {
  
  const {connect, icWalletDisclosure, setWalletName, isWalletDetected} = useContext(IdentityContext)

  const selectWalletAndConnect = useCallback(async(wallet)=>{
    await connect(wallet)
    setWalletName(wallet)
    icWalletDisclosure.onClose()
  },[connect, setWalletName, icWalletDisclosure])

  return (
    <Modal isOpen={icWalletDisclosure.isOpen} onClose={icWalletDisclosure.onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Select a wallet</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex flexDir="column" m='8px' mb='32px'>
            <Text mb='20px'>Pick an Internet Computer wallet. Ownership will be transfer to that wallet.</Text>
            <Button size="lg" leftIcon={<Image src={PlugLogo} width={8} />} mb="12px" isDisabled={!isWalletDetected('plug')} onClick={()=> selectWalletAndConnect('plug')}>Plug Wallet</Button>
            <Button size="lg" leftIcon={<Image src={BitfinityLogo} width={5} />} isDisabled={!isWalletDetected('infinityWallet')} onClick={() => selectWalletAndConnect('infinityWallet')}>Infinity Wallet</Button>
          </Flex> 
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default IcWalletModal
