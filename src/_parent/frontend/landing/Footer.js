import { Box, chakra, Container, Link, SimpleGrid, Stack, Text, Heading } from '@chakra-ui/react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faTwitter, faYoutube } from '@fortawesome/free-brands-svg-icons'

const SocialButton = ({ children, href,}) => {
  return (
    <chakra.button bg={'whiteAlpha.100'} rounded={'full'} w={8} h={8} cursor={'pointer'} as={'a'} href={href}
      target='_blank' display={'inline-flex'} alignItems={'center'} justifyContent={'center'} _hover={{ bg:'whiteAlpha.300', }}>
      {children}
    </chakra.button>
  )
}

const ListHeader = ({ children }) => {
  return <Text fontWeight={'500'} fontSize={'lg'} mb={2}>{children}</Text>
}

const Footer = () => {
  return (
    <Box bg={'gray.900'} color={'gray.200'}>
      <Container as={Stack} maxW={'6xl'} py="80px">
        <SimpleGrid templateColumns={{ sm: '1fr 1fr', md: '2fr 1fr 1fr' }} spacing={8}>
          <Stack spacing={6}>
            <Box>
              <Heading as='h2' size="lg">Communities<Text as="span" fontSize="lg">.ooo</Text></Heading>
            </Box>
            <Text fontSize={'sm'}>© 2023 Communities.ooo. All rights reserved.</Text>
            <Stack direction={'row'} spacing={6}>
              <SocialButton href={'https://twitter.com/dfinity'}>
                <FontAwesomeIcon icon={faTwitter} />
              </SocialButton>
              <SocialButton href={'https://github.com/dfinity'}>
                <FontAwesomeIcon icon={faGithub} />
              </SocialButton>
              <SocialButton href={'https://www.youtube.com/dfinity'}>
                <FontAwesomeIcon icon={faYoutube} />
              </SocialButton>
            </Stack>
          </Stack>
          <Stack align={'flex-start'}>
            <ListHeader>Links</ListHeader>
            <Link href={'#how-it-works'}>How it works</Link>
            <Link href={'#features'}>Features</Link>
            <Link href={'#get-started'}>Get Started</Link>
            <Link href={'#faq'}>FAQs</Link>
          </Stack>
          <Stack align={'flex-start'}>
            <ListHeader>External</ListHeader>
            <Link href={'https://dashboard.internetcomputer.org/'} target="_blank">Internet Computer</Link>
            <Link href={'https://internetcomputer.org/how-it-works'} target="_blank">Technical details</Link>
            <Link href={'https://icscan.io/canister/2227b-baaaa-aaaao-abd6a-cai'} target="_blank">IC Explorer</Link>
            <Link href={'https://forum.dfinity.org/'} target="_blank">Forum</Link>
          </Stack>
        </SimpleGrid>
      </Container>
    </Box>
  )
}

export default Footer