import { useState, useContext, useEffect } from 'react'

import { Flex, Box, Heading, Text, Button } from '@chakra-ui/react'

import { IdentityContext } from '../../store/identity'
import { ParentContext } from '../../store/parent'
import { LedgerContext } from '../../store/ledger'

import { isLocal } from '../../agents'
const OnBoarding = ({ createChildBatch }) => {

  const [userFlowStep, setUserFlowStep] = useState()

  const { walletConnected, connect } = useContext(IdentityContext)
	const { loading } = useContext(ParentContext)
  const { balance } = useContext(LedgerContext)


  useEffect(() => {
		if(!window.ic?.plug) {
			setUserFlowStep('download-wallet')
		} else if(!walletConnected) {
			setUserFlowStep('connect-wallet')
		} else if (!isLocal && balance < 0) {
			setUserFlowStep('top-up-wallet')	
		} else if(isLocal || balance > 0) {
      setUserFlowStep('deploy-community')
    }
	},[walletConnected, balance])

  return (
    <Box>
      {userFlowStep === 'download-wallet' && (
          <Flex p="20px">
          <Box flex={1}>
            <img src={require('../../public/launch.jpg')} alt="get started communities" width={400}/>
          </Box>
          <Flex flex={1} flexDir="column" justifyContent="center" alignItems="center" mb="12px">
            <Heading size="lg" mb="16px">Download Wallet</Heading>
            <Text mb="8px" >✓ Running completely on the Internet Computer</Text>
            <Text mb="8px"> ✓ Supports Ethereum & Solana authentication </Text>
            <Text mb="24px"> ✓ One click deploy to user wallet</Text>
            <Button mb="8px" isLoading={loading} onClick={() => {}}>Download Wallet</Button>
          </Flex>
        </Flex>
      )}
      {userFlowStep === 'connect-wallet' && (
        <Flex p="20px">
          <Box flex={1}>
            <img src={require('../../public/launch.jpg')} alt="get started communities" width={400}/>
          </Box>
          <Flex flex={1} flexDir="column" justifyContent="center" alignItems="center" mb="12px">
            <Heading size="lg" mb="16px">Connect Wallet</Heading>
            <Text mb="8px" >✓ Running completely on the Internet Computer</Text>
            <Text mb="8px"> ✓ Supports Ethereum & Solana authentication </Text>
            <Text mb="24px"> ✓ One click deploy to user wallet</Text>
            <Button mb="8px" isLoading={loading} onClick={connect}>Connect Wallet</Button>
          </Flex>
        </Flex>
      )}
      {userFlowStep === 'top-up-wallet' && (
        <Flex p="20px">
          <Box flex={1}>
            <img src={require('../../public/launch.jpg')} alt="get started communities" width={400}/>
          </Box>
          <Flex flex={1} flexDir="column" justifyContent="center" alignItems="center" mb="12px">
            <Heading size="lg" mb="16px">Top Up Wallet</Heading>
            <Text mb="8px" >✓ Running completely on the Internet Computer</Text>
            <Text mb="8px"> ✓ Supports Ethereum & Solana authentication </Text>
            <Text mb="24px"> ✓ One click deploy to user wallet</Text>
            <Button mb="8px" isLoading={loading} onClick={() => {}}>Top Up Wallet</Button>
          </Flex>
        </Flex>
      )}
      {userFlowStep === 'deploy-community' && (
        <Flex p="20px">
          <Box flex={1}>
            <img src={require('../../public/launch.jpg')} alt="get started communities" width={400}/>
          </Box>
          <Flex flex={1} flexDir="column" justifyContent="center" alignItems="center" mb="12px">
            <Heading size="lg" mb="16px">Deploy Community</Heading>
            <Text mb="8px" >✓ Running completely on the Internet Computer</Text>
            <Text mb="8px"> ✓ Supports Ethereum & Solana authentication </Text>
            <Text mb="24px"> ✓ One click deploy to user wallet</Text>
            <Button mb="8px" isLoading={loading} onClick={() => createChildBatch()}>Deploy Community</Button>
          </Flex>
        </Flex>
      )}
    </Box>
  )
}


export default OnBoarding