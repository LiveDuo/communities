import { Box, chakra, Container, Link, SimpleGrid, Stack, Text, VisuallyHidden, Heading } from '@chakra-ui/react';
import { FaGithub, FaTwitter, FaYoutube } from 'react-icons/fa';

const SocialButton = ({ children, label, href,}) => {
  return (
    <chakra.button
      bg={'whiteAlpha.100'}
      rounded={'full'}
      w={8}
      h={8}
      cursor={'pointer'}
      as={'a'}
      href={href}
      display={'inline-flex'}
      alignItems={'center'}
      justifyContent={'center'}
      transition={'background 0.3s ease'}
      _hover={{ bg:'whiteAlpha.200', }}>
      <VisuallyHidden>{label}</VisuallyHidden>
      {children}
    </chakra.button>
  );
};

const ListHeader = ({ children }) => {
  return (
    <Text fontWeight={'500'} fontSize={'lg'} mb={2}>
      {children}
    </Text>
  )
};

const Footer = () => {
  return (
    <Box bg={'gray.900'} color={'gray.200'}>
      <Container as={Stack} maxW={'6xl'} py={10}>
        <SimpleGrid templateColumns={{ sm: '1fr 1fr', md: '2fr 1fr 1fr' }} spacing={8}>
          <Stack spacing={6}>
            <Box>
              <Heading as='h2' size="lg">Communities<Text as="span" fontSize="lg">.ooo</Text></Heading>
            </Box>
            <Text fontSize={'sm'}>© 2023 Communities.ooo. All rights reserved</Text>
            <Stack direction={'row'} spacing={6}>
              <SocialButton label={'Twitter'} href={'https://twitter.com/home'}>
                <FaTwitter />
              </SocialButton>
              <SocialButton label={'Github'} href={'https://github.com/'}>
                <FaGithub />
              </SocialButton>
              <SocialButton label={'YouTube'} href={'https://www.youtube.com/'}>
                <FaYoutube />
              </SocialButton>
            </Stack>
          </Stack>
          <Stack align={'flex-start'}>
            <ListHeader>Sections</ListHeader>
            <Link href={'#how-it-works'}>How it works</Link>
            <Link href={'#features'}>Features</Link>
            <Link href={'#get-started'}>Get Started</Link>
            <Link href={'#FAQ'}>FAQs</Link>
          </Stack>
          <Stack align={'flex-start'}>
            <ListHeader>Useful Links</ListHeader>
            <Link href={'https://dashboard.internetcomputer.org/'} target="_blank">Internet Computer</Link>
            <Link href={'https://internetcomputer.org/how-it-works'} target="_blank">Technical details</Link>
            <Link href={'https://icscan.io/canister/2227b-baaaa-aaaao-abd6a-cai'} target="_blank">IC Explorer</Link>
            <Link href={'#'} target="_blank">Forum</Link>
          </Stack>
        </SimpleGrid>
      </Container>
    </Box>
  );
}

export default Footer