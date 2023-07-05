import { Box, Flex, Text, IconButton, Button,Stack, Collapse, useColorModeValue, useBreakpointValue, useDisclosure } from '@chakra-ui/react'
import { HamburgerIcon, CloseIcon,} from '@chakra-ui/icons'

import DesktopNav from './DesktopNav'
import MobileNav from './MobileNav'

const NAV_ITEMS = [
  {
    label: 'How it works',
    children: [
      { label: 'Create a new community', subLabel: 'Right from your web3 wallet', href: '#', },
      { label: 'No servers involved', subLabel: 'To keep the community alive', href: '#', },
      { label: 'Manage your community', subLabel: 'And nature a healthy ecosystem', href: '#', },
    ],
  },
  { label: 'Features', href: '#', },
  { label: 'FAQs', href: '#', },
];

const Navbar = () => {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <Box>
      <Flex bg={useColorModeValue('white', 'gray.800')} color={useColorModeValue('gray.600', 'white')} minH={'60px'} 
        py={{ base: 2 }} px={{ base: 4 }} borderBottom={1} borderStyle={'solid'} borderColor={useColorModeValue('gray.200', 'gray.900')} align={'center'}>
        <Flex flex={{ base: 1, md: 'auto' }} ml={{ base: -2 }} display={{ base: 'flex', md: 'none' }}>
          <IconButton onClick={onToggle} icon={isOpen ? <CloseIcon w={3} h={3} /> : <HamburgerIcon w={5} h={5} />} variant={'ghost'} aria-label={'Toggle Navigation'}/>
        </Flex>
        <Flex flex={{ base: 1 }} justify={{ base: 'center', md: 'start' }}>
          <Text textAlign={useBreakpointValue({ base: 'center', md: 'left' })} fontFamily={'heading'} color={useColorModeValue('gray.800', 'white')}>
            Communities.ooo
          </Text>
          <Flex display={{ base: 'none', md: 'flex' }} ml={10}>
            <DesktopNav navItems={NAV_ITEMS} />
          </Flex>
        </Flex>

        <Stack flex={{ base: 1, md: 0 }} justify={'flex-end'} direction={'row'} spacing={6}>
          <Button as={'a'} display={{ base: 'none', md: 'inline-flex' }} fontSize={'sm'} fontWeight={400} variant={'link'} href={'#'}>
            About
          </Button>
          <Button as={'a'} display={{ base: 'none', md: 'inline-flex' }} fontSize={'sm'} fontWeight={600} color={'white'} bg={'green.400'} href={'#'} _hover={{bg: 'green.300',}}>
            Get Started
          </Button>
        </Stack>
      </Flex>

      <Collapse in={isOpen} animateOpacity>
        <MobileNav  navItems={NAV_ITEMS}  />
      </Collapse>
    </Box>
  );
}

export default Navbar
