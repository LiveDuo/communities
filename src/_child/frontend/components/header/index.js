import { useContext, useEffect, useMemo } from 'react'

import { Button, Box, Flex, Link, Menu, MenuButton, MenuList, MenuItem, IconButton } from '@chakra-ui/react'
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'

import Jazzicon from 'react-jazzicon'

import { IdentityContext } from '../../store/identity'
import { ChildContext } from '../../store/child'
import { getSeedFromAccount, addressToName, capitalizeFirstLetter } from '../../utils/address'

import { ReactComponent as EthereumLogo } from '../../logos/ethereum.svg'
import { ReactComponent as SolanaLogo } from '../../logos/solana.svg'
import { ReactComponent as DfinityLogo } from '../../logos/dfinity.svg'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload, faUserShield, faArrowRightFromBracket, faHouse, faEllipsis, faServer, faWallet } from '@fortawesome/free-solid-svg-icons'

const Header = () => {

  const navigate = useNavigate()
  const location = useLocation()

  const { principal, disconnect, account, setSelectedNetwork, onWalletModalOpen, onUpgradeModalOpen, isWalletDetected, icWalletDisclosure, setupCustomDomainDisclosure, topUpDisclosure} = useContext(IdentityContext)
  const { getProfile, login, profile } = useContext(ChildContext)

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
  const isAdmin = useMemo(()=> profile?.roles?.some(r => r.hasOwnProperty('Admin') ),[profile])

  return (
    <Flex m="20px" alignItems="center">
      {location.pathname !== '/' && 
        <Box ml="20px">
          <IconButton size="md" icon={<FontAwesomeIcon icon={faHouse}/>} onClick={() => navigate('/')}/>
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
        !location.pathname.startsWith('/user') &&
        <Box ml="auto">
          <Link as={RouterLink} to={`/user/${account?.type.toLowerCase()}/${account?.address}`}>
            <Button >
              <Box h="16px" w="16px" mr="8px">
                <Jazzicon diameter={20} seed={getSeedFromAccount(account)} />
              </Box>
              {capitalizeFirstLetter(addressToName(account.address))}
            </Button>
          </Link>
        </Box>}
        {(account && principal) && 
        <Box display="inline-block" ml={!location.pathname.startsWith('/user') ? '8px' : 'auto'}>
          <Menu>
            <MenuButton fontSize="25px" as={IconButton} aria-label='Options' icon={<FontAwesomeIcon icon={faEllipsis} />}>
              Sign in with...
            </MenuButton>
            <MenuList>
              {isAdmin && <MenuItem icon={<FontAwesomeIcon icon={faUserShield} />} onClick={()=> navigate('/admin')} >Moderation</MenuItem>}
              {isAdmin && <MenuItem icon={<FontAwesomeIcon icon={faServer} />} onClick={()=> setupCustomDomainDisclosure.onOpen()} >Custom domain</MenuItem>}
              {isAdmin && <MenuItem icon={<FontAwesomeIcon icon={faDownload} />} onClick={()=> onUpgradeModalOpen()}>System updates</MenuItem>}
              {isAdmin && <MenuItem icon={<FontAwesomeIcon icon={faWallet} />} onClick={()=> topUpDisclosure.onOpen()}>Topup</MenuItem>}
              <MenuItem icon={<FontAwesomeIcon icon={faArrowRightFromBracket} />} onClick={()=> disconnect()}>Logout</MenuItem>
            </MenuList>
          </Menu>
        </Box>}
    </Flex>
  )
}
export default Header
