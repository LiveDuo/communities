import { useContext, useEffect } from 'react'
import { useEthers, shortenAddress } from '@usedapp/core'
import { Button, Box, Flex, Link } from '@chakra-ui/react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Jazzicon } from '@ukstv/jazzicon-react'

import { useENSName } from '../../utils/hooks'
import { IdentityContext } from '../../store/identity'
import { ProfileContext } from '../../store/profile'

const Header = () => {

  const navigate = useNavigate()

  const { account, activateBrowserWallet } = useEthers()
  const { principal, login, logout } = useContext(IdentityContext)

  const { ENSName } = useENSName(account)

  const { profile, setProfile, getProfileByPrincipal } = useContext(ProfileContext)

  useEffect(() => {
    if (principal)
      getProfileByPrincipal(principal)
  }, [principal, getProfileByPrincipal])

  const loginAndSet = async () => {
    const profile = await login()
    setProfile(profile)
  }

  return (
    <Flex m="20px" alignItems="center">
      <Box ml="20px">
        <Button onClick={() => navigate('/')}>Home</Button>
      </Box>
      <Box display="inline-block" ml="auto">
        {profile?.name.length > 0 && 
          <Box>Hello&nbsp;{profile?.name}!</Box>}
      </Box>
      {(account && principal) &&
        <Box ml="20px">
          <Link as={RouterLink} to={`/user/${account.toLowerCase()}`}>
            <Button>
              <Box h="16px" w="16px" mr="8px">
                <Jazzicon address={account} />
              </Box>
              {ENSName || (account && shortenAddress(account))}
            </Button>
          </Link>
        </Box>}
      {<Box display="inline-block" ml="16px">
        {account ? 
          !principal && (
            <Button onClick={loginAndSet}>
              Sign in with Ethereum
            </Button>) 
        : <Button onClick={activateBrowserWallet}>
          Connect Wallet
        </Button>}
      </Box>}
      {(account && principal) && 
        <Box display="inline-block">
          <Button onClick={logout}>Logout</Button>
        </Box>}
    </Flex>
  )
}
export default Header
