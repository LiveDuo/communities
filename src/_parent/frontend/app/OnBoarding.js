import { useState, useContext, useEffect } from 'react'

import { Flex, Box, Heading, Text, Button, Link } from '@chakra-ui/react'

import { IdentityContext } from '../store/identity'
import { LedgerContext } from '../store/ledger'

import { isLocal } from '../agents/'

const chromeStoreUrl = 'https://chrome.google.com/webstore/detail/plug/cfbfdhimifdmdehjmkdobpcjfefblkjm'

// https://www.blobmaker.app/
const BlobBackground = ({fill}) => (
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <path fill={fill} d="M26.2,-28.4C30.6,-21.8,28.5,-10.9,28.2,-0.3C27.9,10.3,29.3,20.6,24.9,30.7C20.6,40.8,10.3,50.8,-0.5,51.3C-11.3,51.8,-22.7,42.9,-37.3,32.8C-51.9,22.7,-69.8,11.3,-70.2,-0.4C-70.6,-12.1,-53.4,-24.2,-38.8,-30.8C-24.2,-37.4,-12.1,-38.5,-0.6,-37.9C10.9,-37.3,21.8,-35,26.2,-28.4Z" transform="translate(120 70), scale(1.5)" />
  </svg>
)

const OnBoarding = ({ createChildBatch }) => {

  const [userFlowStep, setUserFlowStep] = useState()

  const { walletConnected, connect } = useContext(IdentityContext)
  const { balance } = useContext(LedgerContext)


  useEffect(() => {
		if(!window.ic?.plug) {
			setUserFlowStep('download-wallet')
		} else if(!walletConnected) {
			setUserFlowStep('connect-wallet')
		} else if (!isLocal && (balance / 1e8) <= 0) {
			setUserFlowStep('top-up-wallet')	
		} else if(isLocal || balance > 0) {
      setUserFlowStep('deploy-community')
    }
	},[walletConnected, balance])

  return (
    <Box p="120px 60px">
      {userFlowStep === 'download-wallet' && (
        <Flex position="relative">
          <Box flex={1} position="relative">
            <Box position="relative">
              <Box position="absolute" width="100%" height="100%">
                <BlobBackground fill={"#F2F4F8"}/>
              </Box>
            </Box>
            <Flex position="relative" justifyContent="center">
              <img src={require('../public/download-wallet.png')} alt="get started communities" width={'50%'}/>
            </Flex>
          </Box>
          <Flex flex={1} flexDir="column" justifyContent="center" alignItems="center" mb="12px">
            <Heading size="lg" mb="32px">Download a wallet</Heading>
            <Text mb="16px" >You will need a wallet for the Internet Computer</Text>
            <Text mb="32px"> Our recommendation is <Link href="https://plugwallet.ooo/" target="_blank"><b>Plug Wallet</b></Link></Text>
            <Button mb="24px" onClick={() =>  window.open(chromeStoreUrl, '_blank')}>Get it now</Button>
            <Text fontSize="sm" color='gray'> Refresh the page after installing</Text>
          </Flex>
        </Flex>
      )}
      {userFlowStep === 'connect-wallet' && (
        <Flex>
          <Box flex={1} position="relative">
            <Box position="relative">
              <Box position="absolute" width="100%" height="100%">
                <BlobBackground fill={"#F2F4F8"}/>
              </Box>
            </Box>
            <Flex position="relative" justifyContent="center" mt="20px">
              <img src={require('../public/connect-wallet.png')} alt="get started communities" width={'50%'}/>
            </Flex>
          </Box>
          <Flex flex={1} flexDir="column" justifyContent="center" alignItems="center" mb="12px">
            <Heading size="lg" mb="32px">Connect your wallet</Heading>
            <Text mb="16px" >Your community is about to be deployed</Text>
            <Text mb="32px"> Ownership will be transferred to your wallet</Text>
            <Button mb="24px" onClick={connect}>Connect wallet</Button>
            <Text fontSize="sm" color='gray'> <b>Note:</b> You can change the owner wallet later</Text>
          </Flex>
        </Flex>
      )}
      {userFlowStep === 'top-up-wallet' && (
        <Flex>
          <Box flex={1} position="relative">
            <Box position="relative">
              <Box position="absolute" width="100%" height="100%">
                <BlobBackground fill={"#F2F4F8"}/>
              </Box>
            </Box>
            <Flex position="relative" justifyContent="center" mt="20px">
              <img src={require('../public/connect-wallet.png')} alt="get started communities" width={'50%'}/>
            </Flex>
          </Box>
          <Flex flex={1} flexDir="column" justifyContent="center" alignItems="center" mb="12px">
            <Heading size="lg" mb="32px">Top up your wallet</Heading>
            <Text mb="16px" >You will new a few cents for transaction fees</Text>
            <Text mb="24px"> Transfer a few ICP tokens to your address to continue</Text>
            <Button mb="24px" onClick={() => {}}>Top up balance</Button>
            <Text fontSize="sm" color='gray'> <b>Note:</b> That's usually 20c or less worth of ICP</Text>
          </Flex>
        </Flex>
      )}
      {userFlowStep === 'deploy-community' && (
        <Flex>
          <Box flex={1} position="relative">
            <Box position="relative">
              <Box position="absolute" width="100%" height="100%">
                <BlobBackground fill={"#F2F4F8"}/>
              </Box>
            </Box>
            <Flex position="relative" justifyContent="center" mt="20px">
              <img src={require('../public/connect-wallet.png')} alt="get started communities" width={'50%'}/>
            </Flex>
          </Box>
          <Flex flex={1} flexDir="column" justifyContent="center" alignItems="center" mb="12px">
            <Heading size="lg" mb="32px">Deploy a community</Heading>
            <Text mb="16px" >You will deploy a virtual server on the Internet Computer</Text>
            <Text mb="24px">The ownership of this server will be transferred to your wallet</Text>
            <Button mb="24px" onClick={() => createChildBatch()}>Deploy community</Button>
            <Text fontSize="sm" color='gray'> <b>Note:</b> New communities take about 1 min to deploy</Text>
          </Flex>
        </Flex>
      )}
    </Box>
  )
}


export default OnBoarding