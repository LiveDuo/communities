import { useContext } from 'react'
import { IdentityContext } from '../../store/identity'
import { ChildContext } from '../../store/child'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Flex } from '@chakra-ui/react'
import { Button, Box, Text, Link , Icon} from '@chakra-ui/react'
import { ReactComponent as EthereumLogo } from '../../logos/ethereum.svg'
import { ReactComponent as SolanaLogo } from '../../logos/solana.svg'

const WalletModal = () => {
  const {isModalOpen, onModalClose, selectedNetwork, setSelectedNetwork, login} = useContext(IdentityContext)
  const { setProfile } = useContext(ChildContext)

  const loginAndSet = async (type) => {
    if (type === 'evm' && !window?.ethereum) {
      setSelectedNetwork(type)
      return
    } else if (type === 'svm' && !window?.solana) {
      setSelectedNetwork(type)
      return
    }
    const profile = await login(type)
    setProfile(profile)
    onModalClose()
  }

	return (
		<Modal isOpen={isModalOpen} onClose={onModalClose} isCentered>
			<ModalOverlay />
			<ModalContent minW="600px">
				<ModalHeader>{(window?.ethereum || window?.solana) ? 'Sign in with...' : 'Download Wallet'} </ModalHeader>
				<ModalCloseButton />
				<ModalBody>
          {selectedNetwork ? 
            <Box>
              {selectedNetwork === 'evm' && <Text>Download Metamask <Link href="https://metamask.io/download/" isExternal>download</Link></Text>}
              {selectedNetwork === 'svm' &&  <Text>Download Phantom <Link href="https://phantom.app/download" isExternal>download</Link></Text>}
            </Box> : 
            <Box>
              {(window?.ethereum || window?.solana) ?
                <Flex justifyContent={'center'}>
                  {window?.ethereum && <Button leftIcon={<Icon as={EthereumLogo}/>} onClick={() => loginAndSet('evm')}>Ethereum</Button>}
                  {window?.solana && <Button leftIcon={<Icon as={SolanaLogo}/>} onClick={() => loginAndSet('svm')}>Solana</Button>}
                </Flex> : 
                <Flex justifyContent={'center'}>
                  <Text>Download Metamask <Link href="https://metamask.io/download/" isExternal>download</Link></Text>
                  <Text>Download Phantom <Link href="https://phantom.app/download" isExternal>download</Link></Text>
                </Flex>}
            </Box>}
				</ModalBody>
			</ModalContent>
		</Modal>
	)
}
export default WalletModal