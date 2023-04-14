import { useContext, useEffect, useState } from 'react'
import { IdentityContext } from '../../store/identity'
import { Modal, ModalFooter, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Box,} from '@chakra-ui/react'
import { Text, Button, Link } from '@chakra-ui/react'

import { ReactComponent as ChromeLogo } from '../../logos/chrome.svg'
import { ReactComponent as BraveLogo } from '../../logos/brave.svg'
import { ReactComponent as FirefoxLogo } from '../../logos/firefox.svg'

const WalletModal = () =>  {
  
  const {modalDisclosure, connect} = useContext(IdentityContext)
  const [plugInstalled, setPlugInstalled] = useState()

  useEffect(() => {
    setPlugInstalled(!!window.ic.plug)
  }, [])

  return (
    <Modal isOpen={modalDisclosure.isOpen} onClose={modalDisclosure.onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{plugInstalled ? 'Connect Plug Wallet' : 'You\'d need a wallet'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {!plugInstalled ? 
            <Box m='8px'>
              <Text mb='20px'>
                Download Plug Wallet extension for your browser.
              </Text>
              <Link href='https://chrome.google.com/webstore/detail/plug/cfbfdhimifdmdehjmkdobpcjfefblkjm' isExternal style={{textDecoration: 'none'}}>
                <Button leftIcon={<FirefoxLogo width={20}/>}>Chrome</Button>
              </Link>
              <Link href='https://addons.mozilla.org/en-US/firefox/addon/plug/' isExternal style={{textDecoration: 'none'}}>
                <Button leftIcon={<ChromeLogo width={20}/>} ml="12px">Firefox</Button>
              </Link>
              <Link href='https://chrome.google.com/webstore/detail/plug/cfbfdhimifdmdehjmkdobpcjfefblkjm' isExternal style={{textDecoration: 'none'}}>
                <Button leftIcon={<BraveLogo width={20}/>} ml="12px">Brave</Button>
              </Link>
            </Box> : 
            <Box m='8px'>
              <Text mb='20px'>
                You'd need to connect your wallet first.
              </Text>
            </Box>
            }
        </ModalBody>
        {plugInstalled && 
          <ModalFooter>
          <Button variant='solid' onClick={connect}>Connect</Button>
        </ModalFooter>}
      </ModalContent>
    </Modal>
  )
}

export default WalletModal
