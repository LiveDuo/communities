import { useContext, useEffect } from 'react'

import { Button, Box, Flex, Link, Menu, MenuButton, MenuList, MenuItem, IconButton, Icon } from '@chakra-ui/react'
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'

import Jazzicon from 'react-jazzicon'

import { IdentityContext } from '../../store/identity'
import { ChildContext } from '../../store/child'
import { addressShort, getSeedFromAccount } from '../../utils/address'

import { ReactComponent as EthereumLogo } from '../../logos/ethereum.svg'
import { ReactComponent as SolanaLogo } from '../../logos/solana.svg'
import { ReactComponent as DfinityLogo } from '../../logos/dfinity.svg'

import { BiHome, BiDotsHorizontalRounded, BiCog, BiLogOut } from "react-icons/bi"


const Header = () => {

  const navigate = useNavigate()
  const location = useLocation()

  const { principal, disconnect, account, setSelectedNetwork, onWalletModalOpen, onUpgradeModalOpen, isWalletDetected, icWalletDisclosure } = useContext(IdentityContext)
  const { getProfile, login } = useContext(ChildContext)

  useEffect(() => {
      getProfile()
  }, [getProfile])

  const loginAndSet = async (type) => {
    if (type === 'evm' && !isWalletDetected(type)) {
      onWalletModalOpen()
      setSelectedNetwork(type)
      return
    } else if (type === 'svm' && !isWalletDetected(type)) {
      onWalletModalOpen()
      setSelectedNetwork(type)
      return
    } else if (type === 'ic' && !isWalletDetected(type)) {
      onWalletModalOpen()
      setSelectedNetwork(type)
      return
    } else if (type === 'ic' && isWalletDetected(type)){
      icWalletDisclosure.onOpen()
      return
    }
    await login(type)
  }

  return (
    <Flex m="20px" alignItems="center">
      {location.pathname !== '/' && 
        <Box ml="20px">
          <IconButton size="md" icon={<BiHome/>} onClick={() => navigate('/')}/>
        </Box>
      }
      {!(account && principal) &&
        (<Box ml="auto">
          <Menu>
            <MenuButton as={Button}>
              Sign in with...
            </MenuButton>
            <MenuList>
              <MenuItem onClick={()=> loginAndSet('evm')}><EthereumLogo width={12} style={{marginRight: "16px", marginLeft: "8px"}}/>Ethereum</MenuItem>
              <MenuItem onClick={()=> loginAndSet('svm')}><SolanaLogo width={12} style={{marginRight: "16px", marginLeft: "8px"}}/>Solana</MenuItem>
              <MenuItem onClick={()=> loginAndSet('ic')}><DfinityLogo width={12} style={{marginRight: "16px", marginLeft: "8px"}}/>Internet Computer</MenuItem>
            </MenuList>
          </Menu>
        </Box>)}
        {(account && principal) &&
        <Box ml="auto">
          <Link as={RouterLink} to={`/user/${account?.address}/${account?.type}`}>
            <Button >
              <Box h="16px" w="16px" mr="8px">
                <Jazzicon diameter={20} seed={getSeedFromAccount(account)} />
              </Box>
              {addressShort(account.address)}
            </Button>
          </Link>
        </Box>}
        {(account && principal) && 
        <Box display="inline-block" ml="8px">
          <Menu>
            <MenuButton fontSize="25px" as={IconButton} aria-label='Options' icon={<BiDotsHorizontalRounded />}>
              Sign in with...
            </MenuButton>
            <MenuList>
              <MenuItem icon={<Icon fontSize="md" as={BiCog} />} onClick={()=> onUpgradeModalOpen()}>Admin</MenuItem>
              <MenuItem icon={<Icon fontSize="md" as={BiLogOut} />} onClick={()=> disconnect()}>Logout</MenuItem>
            </MenuList>
          </Menu>
        </Box>}
    </Flex>
  )
}
export default Header
