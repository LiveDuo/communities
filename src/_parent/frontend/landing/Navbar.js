import { Box, Flex, Text, IconButton, Button,Stack, Collapse, useColorModeValue, useBreakpointValue, useDisclosure } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons'
import DesktopNav from './shared/DesktopNav'
import MobileNav from './shared/MobileNav'
import {useNavigate} from 'react-router-dom'

const NAV_ITEMS = [
  {
    label: 'How it works',
    children: [
      { label: 'Create a new community', subLabel: 'Owned through a digital wallet', href: '#ownership', },
      { label: 'Simple to host', subLabel: 'No hosting provider required', href: '#maintenance', },
      { label: 'Manage your community', subLabel: 'Tools to nature and grow', href: '#management', },
    ],
  },
  { label: 'Features', href: '#features', },
  { label: 'FAQs', href: '#faq', },
];

const Navbar = () => {
  const { isOpen, onToggle } = useDisclosure();
  const navigate = useNavigate()
  return (
    <Box>
      <Flex bg={useColorModeValue('white', 'gray.800')} color={useColorModeValue('gray.600', 'white')} minH={'60px'} 
        py={{ base: 2 }} px={{ base: 4 }} borderBottom={1} borderStyle={'solid'} borderColor={useColorModeValue('gray.200', 'gray.900')} align={'center'}>
        <Flex flex={{ base: 1, md: 'auto' }} ml={{ base: -2 }} display={{ base: 'flex', md: 'none' }}>
          <IconButton onClick={onToggle} icon={isOpen ? <FontAwesomeIcon icon={faXmark} w={3} h={3} /> : <FontAwesomeIcon icon={faBars} w={5} h={5} />} variant={'ghost'} aria-label={'Toggle Navigation'}/>
        </Flex>
        <Flex flex={{ base: 1 }} justify={{ base: 'center', md: 'start' }}>
          <Text textAlign={useBreakpointValue({ base: 'center', md: 'left' })} fontFamily={'heading'} color={useColorModeValue('gray.800', 'white')} fontWeight="bold">
            Communities
          </Text>
          <Flex display={{ base: 'none', md: 'flex' }} ml={10}>
            <DesktopNav navItems={NAV_ITEMS} />
          </Flex>
        </Flex>

        <Stack flex={{ base: 1, md: 0 }} justify={'flex-end'} direction={'row'} spacing={6}>
          <Button as={'a'} display={{ base: 'none', md: 'inline-flex' }} fontSize={'sm'} fontWeight={400} variant={'link'} onClick={() => navigate('/app')} >
            Already an owner?
          </Button>
          <Button as={'a'} display={{ base: 'none', md: 'inline-flex' }} fontSize={'sm'} fontWeight={600} color={'white'} bg={'green.400'} _hover={{bg: 'green.300'}} onClick={() => navigate('/app')}>
            Get Started
          </Button>
        </Stack>
      </Flex>

      <Collapse in={isOpen} animateOpacity>
        <MobileNav navItems={NAV_ITEMS}/>
      </Collapse>
    </Box>
  );
}

export default Navbar
