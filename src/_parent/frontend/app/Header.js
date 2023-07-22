import { useContext } from 'react'
import { Button, Flex, Box, Tag, Text, Link } from '@chakra-ui/react'

import { IdentityContext } from '../store/identity'
import { LedgerContext } from '../store/ledger'

import { isLocal } from '../utils/url'

const Header = () => {
  const {walletConnected, disconnect, host, userPrincipal } = useContext(IdentityContext)
  const { balance } = useContext(LedgerContext)

  const userPrincipalShorten = userPrincipal.slice(0, 5) + '...' + userPrincipal.slice(-3)

  return (
    <Flex justifyContent="center" alignItems="center" m="20px">
      {host && <Box>
        <Tag colorScheme={isLocal ? 'purple' : 'blue'} size="md">{isLocal ? 'Local' : 'Mainnet'}</Tag>
      </Box>}
			<Flex ml="auto">
				{walletConnected && (
          <>
            <Flex display="inline-flex" bgColor="gray.200" p="4px" alignItems="center" borderRadius="8px">
              <Text m="0px 20px">{(balance / 1e8).toFixed(2)} ICP</Text>
              <Link href={`https://www.icscan.io/principal/${userPrincipal}`} isExternal>
                <Button height="32px">{userPrincipalShorten}</Button>
              </Link>
            </Flex>
            <Button ml="8px" onClick={disconnect}>Disconnect</Button>
          </>
        )}
			</Flex>
    </Flex>
  )
}
export default Header
