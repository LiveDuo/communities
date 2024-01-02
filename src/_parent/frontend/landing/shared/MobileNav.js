import { Stack, Flex, Text, Collapse, Link } from '@chakra-ui/react'
import { useDisclosure, useColorModeValue } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
const MobileNavItem = ({ label, children, href }) => {
  const { isOpen, onToggle } = useDisclosure();

  return (
    <Stack spacing={4} onClick={children && onToggle}>
      <Flex py={2} as={Link} href={href ?? '#'} justify={'space-between'} align={'center'} _hover={{textDecoration: 'none',}}>
        <Text fontWeight={600} color={useColorModeValue('gray.600', 'gray.200')}>{label}</Text>
        {children && <FontAwesomeIcon icon={faChevronDown} style={{transition: 'all .25s ease-in-out', transform: isOpen ? 'rotate(180deg)' : ''}}  size='sm'/>}
      </Flex>

      <Collapse in={isOpen} animateOpacity style={{ marginTop: '0!important' }}>
        <Stack mt={2} pl={4} borderLeft={1} borderStyle={'solid'} borderColor={useColorModeValue('gray.200', 'gray.700')} align={'start'}>
          {children && children.map((child) => <Link key={child.label} py={2} href={child.href}>{child.label}</Link>)}
        </Stack>
      </Collapse>
    </Stack>
  );
};

const MobileNav = ({navItems}) => {
  return (
    <Stack bg={useColorModeValue('white', 'gray.800')} p={4} display={{ md: 'none' }}>
      {navItems.map((navItem) => <MobileNavItem key={navItem.label} {...navItem} />)}
    </Stack>
  );
};

export default MobileNav