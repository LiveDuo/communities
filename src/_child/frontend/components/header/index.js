import { useContext, useEffect } from 'react'
import { Button, Box, Flex, Link, Menu, MenuButton, MenuList, MenuItem  } from '@chakra-ui/react'
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'
import Jazzicon from 'react-jazzicon'
import { IdentityContext } from '../../store/identity'
import { ChildContext } from '../../store/child'
import { addressShort } from '../../utils'

const Header = () => {

  const navigate = useNavigate()
  const location = useLocation()

  const { principal, login, logout, account } = useContext(IdentityContext)


  const { profile, setProfile, getProfileByAddress } = useContext(ChildContext)

  useEffect(() => {
    if (account)
      getProfileByAddress(account)
  }, [account, getProfileByAddress])

  const loginAndSet = async (type) => {
    const profile = await login(type)
    setProfile(profile)
  }

  return (
    <Flex m="20px" alignItems="center">
      {location.pathname !== '/' && <Box ml="20px">
        <Button onClick={() => navigate('/')}>Home</Button>
      </Box>}
      {!profile &&  
        (<Box ml="auto">
          <Menu>
            <MenuButton as={Button}>
              Login
            </MenuButton>
            <MenuList>
              <MenuItem onClick={async ()=> await loginAndSet('evm')} >Ethereum</MenuItem>
              <MenuItem onClick={()=> loginAndSet('svm')} >Solana</MenuItem>
            </MenuList>
          </Menu>
        </Box>)}
        {(account && principal) &&
        <Box  ml="auto">
          <Link as={RouterLink} to={`/user/${account?.address?.toLowerCase()}`}>
            <Button>
              <Box h="16px" w="16px" mr="8px">
                <Jazzicon diameter={20} seed={account?.address} />
              </Box>
              {addressShort(account.address)}
            </Button>
          </Link>
        </Box>}
        {(account && principal) && 
        <Box display="inline-block">
          <Button onClick={logout}>Logout</Button>
        </Box>}
    </Flex>
  )
}
export default Header
