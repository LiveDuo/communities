import { Box, Stack, Heading, Text, Container, SimpleGrid, useBreakpointValue, Icon, Button } from '@chakra-ui/react'

const CTA = () => {
  return (
    <Box position={'relative'}>
      <Container as={SimpleGrid} maxW={'7xl'} columns={{ base: 1, md: 2 }} spacing={{ base: 10, lg: 32 }} py={{ base: 10, sm: 20, lg: 32 }}>
        <Stack spacing={{ base: 10, md: 20 }}>
          <Heading lineHeight={1.1} fontSize={{ base: '3xl', sm: '4xl', md: '5xl', lg: '6xl' }}>
            <Box mt="60px" mb="30px">
              Digital <Text as={'span'} color="white" bgColor="green.300">&nbsp;spaces&nbsp;</Text>
            </Box>
            <Box>
              <Text as={'span'} color="green.300" bgColor="white">&nbsp;Owned&nbsp;</Text> by creators
            </Box>
          </Heading>
        </Stack>
        <Stack bg={'gray.50'} rounded={'xl'} p={{ base: 4, sm: 6, md: 8 }} spacing={{ base: 8 }} maxW={{ lg: 'lg' }}>
          <Stack spacing={4}>
            <Heading color={'gray.800'} lineHeight={1.1} fontSize={{ base: '2xl', sm: '3xl', md: '4xl' }}>
              Launch a community
            </Heading>
            <Text color={'gray.500'} fontSize={{ base: 'sm', sm: 'md' }}>
              <br/>
              ✓ Running completely on the Internet Computer
              <br/>
              <br/>
              ✓ Supports Ethereum & Solana logins
              <br/>
              <br/>
              ✓ One click deploy to user wallet
              <br/>
              <br/>
            </Text>

            <Button colorScheme={'green'} bg={'green.400'} rounded={'full'} px={6} _hover={{ bg: 'green.500' }}>
              Get Started
            </Button>
          </Stack>
        </Stack>
      </Container>
      <Blur position={'absolute'} top={-10} left={-10} style={{ filter: 'blur(70px)' }}/>
    </Box>
  );
}

export default CTA

const Blur = (props) => {
  return (
    <Icon
      width={useBreakpointValue({ base: '100%', md: '40vw', lg: '30vw' })}
      zIndex={-1}
      height="560px"
      viewBox="0 0 528 560"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <circle cx="71" cy="61" r="111" fill="#F56565" />
      <circle cx="244" cy="106" r="139" fill="#ED64A6" />
      <circle cy="291" r="139" fill="#ED64A6" />
      <circle cx="80.5" cy="189.5" r="101.5" fill="#ED8936" />
      <circle cx="196.5" cy="317.5" r="101.5" fill="#ECC94B" />
      <circle cx="70.5" cy="458.5" r="101.5" fill="#48BB78" />
      <circle cx="426.5" cy="-0.5" r="101.5" fill="#4299E1" />
    </Icon>
  )
}