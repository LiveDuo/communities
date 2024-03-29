import { useContext } from 'react'
import { IdentityContext } from '../../store/identity'
import { ChildContext } from '../../store/child'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Button, Box, Text, Link , Icon, Image} from '@chakra-ui/react'

import { ReactComponent as EthereumLogo } from '../../logos/ethereum.svg'
import { ReactComponent as SolanaLogo } from '../../logos/solana.svg'
import { ReactComponent as DfinityLogo } from '../../logos/dfinity.svg'

import { ReactComponent as MetamaskLogo } from '../../logos/metamask.svg'
import { ReactComponent as PhantomLogo } from '../../logos/phantom.svg'
import PlugLogo from '../../logos/plug.png'
import BitfinityLogo from '../../logos/bitfinity.png'

const WalletModal = () => {
  const { isWalletModalOpen, onWalletModalClose, selectedNetwork, isWalletDetected, icWalletDisclosure} = useContext(IdentityContext)
  const { login } = useContext(ChildContext)

  const loginAndSet = async (type) => {
    if(type === 'evm') {
      onWalletModalClose()
      await login(type)
    } else if(type === 'svm') {
      onWalletModalClose()
      await login(type)
    } else if(type === 'ic') {
      onWalletModalClose()
      icWalletDisclosure.onOpen()
    }
  }

	return (
		<Modal isOpen={isWalletModalOpen} onClose={onWalletModalClose} isCentered>
			<ModalOverlay />
			<ModalContent minW="520px">
				<ModalHeader>{!selectedNetwork && (isWalletDetected('evm') || isWalletDetected('svm') ||  isWalletDetected('ic')) ? 'Select a network' : 'You\'d need a wallet'} </ModalHeader>
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
                <Link ml="8px" href="https://phantom.app/download" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<PhantomLogo width="24px"/>}>Phantom</Button></Link>
              </Box>}
              {selectedNetwork === 'ic' && 
                <Box mb="12px">
                  <Text mb="12px">Get an Internet Computer wallet </Text>
                  <Link ml="8px" href="https://plugwallet.ooo/" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<Image src={PlugLogo} width={5} />}>Plug Wallet</Button></Link>
                  <Link ml="8px" href="https://wallet.bitfinity.network/" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<Image src={BitfinityLogo} width={3} />}>Bitfinity Wallet</Button></Link>
                </Box>}
            </Box> : 
            <Box>
              {(isWalletDetected('evm') || isWalletDetected('svm') ||  isWalletDetected('ic')) ?
              <Box mb="20px">
                <Text mb="20px">
                  Sign in with your wallet. Available wallets:
                </Text>
                <Box>
                  {isWalletDetected('evm') && <Button ml="8px" leftIcon={<Icon as={EthereumLogo}/>} onClick={() => loginAndSet('evm')}>Ethereum</Button>}
                  {isWalletDetected('svm') && <Button ml="8px" leftIcon={<Icon as={SolanaLogo}/>} onClick={() => loginAndSet('svm')}>Solana</Button>}
                  {isWalletDetected('ic') && <Button ml="8px" leftIcon={<Icon as={DfinityLogo}/>} onClick={() => loginAndSet('ic')}>Internet Computer</Button>}
                </Box>
              </Box> :
                <Box mb="20px">
                  <Box mb="12px">
                    <Text mb="12px">Get an Ethereum wallet </Text>
                    <Link ml="8px" href="https://metamask.io/download/" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<MetamaskLogo width="24px"/>}>Metamask</Button></Link>
                  </Box>
                  <Box>
                    <Text mb="12px">Get a Solana wallet</Text>
                    <Link ml="8px" href="https://phantom.app/download" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<PhantomLogo width="24px"/>}>Phantom</Button></Link>
                  </Box>
                  <Box>
                    <Text mb="12px">Get a Internet Computer wallet</Text>
                    <Link ml="8px" href="https://plugwallet.ooo/" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<Image src={PlugLogo} width={5} />}>Plug Wallet</Button></Link>
                  </Box>
              </Box>}
            </Box>}
				</ModalBody>
			</ModalContent>
		</Modal>
	)
}
export default WalletModal