import { useContext } from 'react'
import { Button, Flex, Box, Heading } from '@chakra-ui/react'

import { IdentityContext } from '../../store/identity'

import { isLocalhost } from '../../utils'

const Header = () => {
  const {walletConnected, connect, disconnect, host, userPrincipal} = useContext(IdentityContext)

  const userPrincipalShorten = userPrincipal.slice(0, 5) + '...' + userPrincipal.slice(-3)

  const onConnect = () => {
    if (isLocalhost()) {
      connect('localhost')
    } else {
      connect('mainnet')
    }
  }

  return (
    <Flex justifyContent="center" alignItems="center" m="20px">
      {host && <Box>
        <Heading display="inline" size={'sm'}>User: </Heading>{userPrincipalShorten}
        <Heading ml="8px" display="inline" size={'sm'}>Host: </Heading>{host}
      </Box>}
			<Box ml="auto">
				<Button onClick={onConnect} disabled={walletConnected}>Connect</Button>
				<Button ml="8px" onClick={disconnect} disabled={!walletConnected}>Disconnect</Button>
			</Box>
    </Flex>
  )
}
export default Header
