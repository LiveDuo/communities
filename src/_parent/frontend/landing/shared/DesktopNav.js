import { Box, Flex, Text, Stack, Link, Popover, PopoverTrigger, PopoverContent } from '@chakra-ui/react';
import { useColorModeValue } from '@chakra-ui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronRight } from '@fortawesome/free-solid-svg-icons'
const DesktopSubNav = ({ label, href, subLabel }) => {
  return (
    <Link href={href} role={'group'} display={'block'} p={2} rounded={'md'} _hover={{ bg: useColorModeValue('green.50', 'green.900') }}>
      <Stack direction={'row'} align={'center'}>
        <Box>
          <Text transition={'all .3s ease'} _groupHover={{ color: 'green.400' }} fontWeight={500}>{label}</Text>
          <Text fontSize={'sm'}>{subLabel}</Text>
        </Box>
        <Flex transition={'all .3s ease'} transform={'translateX(-10px)'} opacity={0} _groupHover={{ opacity: '100%', transform: 'translateX(0)' }} justify={'flex-end'} align={'center'} flex={1}>
          <FontAwesomeIcon icon={faChevronRight} style={{color: '#48BB78'}} size='sm'/>
        </Flex>
      </Stack>
    </Link>
  );
};

const DesktopNav = ({navItems}) => {
  const linkColor = useColorModeValue('gray.600', 'gray.200');
  const linkHoverColor = useColorModeValue('gray.800', 'white');
  const popoverContentBgColor = useColorModeValue('white', 'gray.800');

  return (
    <Stack direction={'row'} spacing={4}>
      {navItems.map((navItem) => (
        <Box key={navItem.label}>
          <Popover trigger={'hover'} placement={'bottom-start'}>
            <PopoverTrigger>
              <Link p={2} href={navItem.href ?? '#'} color={linkColor} _hover={{ textDecoration: 'none', color: linkHoverColor, }}>
                {navItem.label}
              </Link>
            </PopoverTrigger>
            {navItem.children && (
              <PopoverContent border={0} boxShadow={'xl'} bg={popoverContentBgColor} p={4} rounded={'xl'} minW={'sm'}>
                <Stack>{navItem.children.map((child) => <DesktopSubNav key={child.label} {...child} />)}</Stack>
              </PopoverContent>
            )}
          </Popover>
        </Box>
      ))}
    </Stack>
  );
};

export default DesktopNav
