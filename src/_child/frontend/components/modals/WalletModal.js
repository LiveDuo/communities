import { useContext } from 'react'
import { IdentityContext } from '../../store/identity'
import { ChildContext } from '../../store/child'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Button, Box, Text, Link , Icon, Image} from '@chakra-ui/react'

import { ReactComponent as EthereumLogo } from '../../logos/ethereum.svg'
import { ReactComponent as SolanaLogo } from '../../logos/solana.svg'
import { ReactComponent as DfinityLogo } from '../../logos/dfinity.svg'


import { ReactComponent as MetamaskLogo } from '../../logos/metamask.svg'
import PhantomLogo from '../../logos/phantom.svg'
import PlugLogo from '../../logos/plug.png'

const WalletModal = () => {
  const { isWalletModalOpen, onWalletModalClose, selectedNetwork, setSelectedNetwork, IsWalletDetected} = useContext(IdentityContext)
  const { login } = useContext(ChildContext)

  const loginAndSet = async (type) => {
    if (type === 'evm' && IsWalletDetected(type)) {
      setSelectedNetwork(type)
      return
    } else if (type === 'svm' && IsWalletDetected(type)) {
      setSelectedNetwork(type)
      return
    } else if (type === 'ic' && IsWalletDetected(type)) {
      setSelectedNetwork(type)
      return
    }
    await login(type)
    onWalletModalClose()
  }

	return (
		<Modal isOpen={isWalletModalOpen} onClose={onWalletModalClose} isCentered>
			<ModalOverlay />
			<ModalContent minW="480px">
				<ModalHeader>{!selectedNetwork && (IsWalletDetected('evm') || IsWalletDetected('svm') ||  IsWalletDetected('ic')) ? 'Select a network' : 'You\'d need a wallet'} </ModalHeader>
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
                <Link ml="8px" href="https://phantom.app/download" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<Image src={PhantomLogo} width={5}/>}>Phantom</Button></Link>
              </Box>}
              {selectedNetwork === 'ic' && 
                <Box mb="12px">
                  <Text mb="12px">Get an Internet Computer wallet </Text>
                  <Link ml="8px" href="https://plugwallet.ooo/" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<Image src={PlugLogo} width={5} />}>Plug Wallet</Button></Link>
                </Box>}
            </Box> : 
            <Box>
              {(IsWalletDetected('evm') || IsWalletDetected('svm') ||  IsWalletDetected('ic')) ?
              <Box mb="20px">
                <Text mb="20px">
                  Sign in with your wallet. Available wallets:
                </Text>
                <Box>
                  {IsWalletDetected('evm') && <Button ml="8px" leftIcon={<Icon as={EthereumLogo}/>} onClick={() => loginAndSet('evm')}>Ethereum</Button>}
                  {IsWalletDetected('svm') && <Button ml="8px" leftIcon={<Icon as={SolanaLogo}/>} onClick={() => loginAndSet('svm')}>Solana</Button>}
                  {IsWalletDetected('ic') && <Button ml="8px" leftIcon={<Icon as={DfinityLogo}/>} onClick={() => loginAndSet('ic')}>Internet Computer</Button>}
                </Box>
              </Box> :
                <Box mb="20px">
                  <Box mb="12px">
                    <Text mb="12px">Get an Ethereum wallet </Text>
                    <Link ml="8px" href="https://metamask.io/download/" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<MetamaskLogo width="24px"/>}>Metamask</Button></Link>
                  </Box>
                  <Box>
                    <Text mb="12px">Get a Solana wallet</Text>
                    <Link ml="8px" href="https://phantom.app/download" isExternal style={{textDecoration: 'none'}}><Button leftIcon={<Image src={PhantomLogo} width={5}/>}>Phantom</Button></Link>
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