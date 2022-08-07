import { useContext } from 'react'
import { Button, Flex, Box, Tag } from '@chakra-ui/react'

import { IdentityContext } from '../../store/identity'

import { isLocalhost, getHostFromUrl } from '../../utils'

const Header = () => {
  const {walletConnected, connect, disconnect, host, userPrincipal} = useContext(IdentityContext)

  const userPrincipalShorten = userPrincipal.slice(0, 5) + '...' + userPrincipal.slice(-3)

  const onConnect = () => {
    if (isLocalhost(window.location.host)) {
      connect('localhost')
    } else {
      connect('mainnet')
    }
  }

  const isLocal = isLocalhost(getHostFromUrl(host))
  return (
    <Flex justifyContent="center" alignItems="center" m="20px">
      {host && <Box>
        <Tag colorScheme={isLocal ? 'purple' : 'blue'} size="md">{isLocal ? 'Local' : 'Mainnet'}</Tag>
      </Box>}
			<Box ml="auto">
				{!walletConnected ? <Button onClick={onConnect}>Connect</Button> : <Button>{userPrincipalShorten}</Button>}
				{walletConnected && <Button ml="8px" onClick={disconnect}>Disconnect</Button>}
			</Box>
    </Flex>
  )
}
export default Header
