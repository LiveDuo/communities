import { useContext } from 'react'
import { Button, Flex, Box, Heading } from '@chakra-ui/react'

import { IdentityContext } from '../../store/identity'

const Header = () => {
  const {walletConnected, onConnect, onDisconnect, host, userPrincipal} = useContext(IdentityContext)

  const userPrincipalShorten = userPrincipal.slice(0, 5) + '...' + userPrincipal.slice(-3)

  return (
    <Flex justifyContent="center" alignItems="center" m="20px">
      <Box><Heading display="inline" size={'sm'}>User: </Heading>{userPrincipalShorten}</Box>
			<Box ml="8px"><Heading display="inline" size={'sm'}>Host: </Heading>{host}</Box>
			<Box ml="8px">
				<Button onClick={() => onConnect('localhost')} disabled={walletConnected}>Connect Localhost</Button>
				<Button ml="8px" onClick={() => onConnect('mainnet')} disabled={walletConnected}>Connect Mainnet</Button>
				<Button ml="8px" onClick={onDisconnect} disabled={!walletConnected}>Disconnect</Button>
			</Box>
    </Flex>
  )
}
export default Header
