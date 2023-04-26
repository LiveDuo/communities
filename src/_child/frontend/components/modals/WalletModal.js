import { useContext } from 'react'
import { IdentityContext } from '../../store/identity'
import { ChildContext } from '../../store/child'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Button, Box, Text, Link , Icon} from '@chakra-ui/react'

import { ReactComponent as EthereumLogo } from '../../logos/ethereum.svg'
import { ReactComponent as SolanaLogo } from '../../logos/solana.svg'

import { ReactComponent as MetamaskLogo } from '../../logos/metamask.svg'
import { ReactComponent as PhantomLogo } from '../../logos/phantom.svg'

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
			<ModalContent minW="480px">
				<ModalHeader>{!selectedNetwork && (window?.ethereum || window?.solana) ? 'Select a network' : 'You\'d need a wallet'} </ModalHeader>
				<ModalCloseButton />
				<ModalBody>
          {selectedNetwork ? 
            <Box mb="20px">
              {selectedNetwork === 'evm' && 
                <Box mb="12px">
                  <Text mb="12px">Get an Ethereum wallet </Text>
                  <Link ml="8px" href="https://metamask.io/download/" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<MetamaskLogo width="24px"/>}>Metamask</Button></Link>
                </Box>}
              {selectedNetwork === 'svm' &&  <Box>
                <Text mb="12px">Get a Solana wallet</Text>
                <Link ml="8px" href="https://phantom.app/download" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<PhantomLogo width="16px"/>}>Phantom</Button></Link>
              </Box>}
            </Box> : 
            <Box>
              {(window?.ethereum || window?.solana) ?
              <Box mb="20px">
                <Text mb="20px">
                  Sign in with your wallet. Available wallets:
                </Text>
                <Box>
                  {window?.ethereum && <Button ml="8px" leftIcon={<Icon as={EthereumLogo}/>} onClick={() => loginAndSet('evm')}>Ethereum</Button>}
                  {window?.solana && <Button ml="8px" leftIcon={<Icon as={SolanaLogo}/>} onClick={() => loginAndSet('svm')}>Solana</Button>}
                </Box>
              </Box> :
                <Box mb="20px">
                  <Box mb="12px">
                    <Text mb="12px">Get an Ethereum wallet </Text>
                    <Link ml="8px" href="https://metamask.io/download/" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<MetamaskLogo width="24px"/>}>Metamask</Button></Link>
                  </Box>
                  <Box>
                    <Text mb="12px">Get a Solana wallet</Text>
                    <Link ml="8px" href="https://phantom.app/download" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<PhantomLogo width="16px"/>}>Phantom</Button></Link>
                  </Box>
              </Box>}
            </Box>}
				</ModalBody>
			</ModalContent>
		</Modal>
	)
}
export default WalletModal