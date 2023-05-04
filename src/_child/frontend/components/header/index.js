import { useContext, useEffect } from 'react'
import { Button, Box, Flex, Link, Menu, MenuButton, MenuList, MenuItem  } from '@chakra-ui/react'
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'
import Jazzicon from 'react-jazzicon'
import { IdentityContext } from '../../store/identity'
import { ChildContext } from '../../store/child'
import { addressShort } from '../../utils/address'

import { ReactComponent as EthereumLogo } from '../../logos/ethereum.svg'
import { ReactComponent as SolanaLogo } from '../../logos/solana.svg'
import { ReactComponent as DfinityLogo } from '../../logos/dfinity.svg'

const Header = () => {

  const navigate = useNavigate()
  const location = useLocation()

  const { identity, login, logout, account, setSelectedNetwork, onModalOpen } = useContext(IdentityContext)
  const { setProfile, getProfileByAuth } = useContext(ChildContext)

  useEffect(() => {
    if (account)
    getProfileByAuth(account)
  }, [account, getProfileByAuth])

  const loginAndSet = async (type) => {
    if (type === 'evm' && !window?.ethereum) {
      onModalOpen()
      setSelectedNetwork(type)
      return
    } else if (type === 'svm' && !window?.solana) {
      onModalOpen()
      setSelectedNetwork(type)
      return
    } else if (type === 'ic' && !window?.ic?.plug) {
      onModalOpen()
      setSelectedNetwork(type)
      return
    }
    const profile = await login(type)
    setProfile(profile)
  }

  return (
    <Flex m="20px" alignItems="center">
      {location.pathname !== '/' && <Box ml="20px">
        <Button onClick={() => navigate('/')}>Home</Button>
      </Box>}
      {!(account && identity?.getPrincipal()) &&
        (<Box ml="auto">
          <Menu>
            <MenuButton as={Button}>
              Sign in with...
            </MenuButton>
            <MenuList>
              <MenuItem onClick={()=> loginAndSet('evm')}><EthereumLogo width={12} style={{marginRight: "16px", marginLeft: "8px"}}/>Ethereum</MenuItem>
              <MenuItem onClick={()=> loginAndSet('svm')}><SolanaLogo width={12} style={{marginRight: "16px", marginLeft: "8px"}}/>Solana</MenuItem>
              {/* <MenuItem  onClick={()=> loginAndSet('ic')}><DfinityLogo width={12} style={{marginRight: "16px", marginLeft: "8px"}}/>IC</MenuItem> */}
            </MenuList>
          </Menu>
        </Box>)}
        {(account && identity?.getPrincipal()) &&
        <Box ml="auto">
          <Link as={RouterLink} to={`/user/${account?.address}/${account?.type}`}>
            <Button>
              <Box h="16px" w="16px" mr="8px">
                <Jazzicon diameter={20} seed={account?.address} />
              </Box>
              {addressShort(account.address)}
            </Button>
          </Link>
        </Box>}
        {(account && identity?.getPrincipal()) && 
        <Box display="inline-block" ml="8px">
          <Button onClick={logout}>Logout</Button>
        </Box>}
    </Flex>
  )
}
export default Header
