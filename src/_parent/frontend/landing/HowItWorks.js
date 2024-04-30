import { Container, SimpleGrid, Image, Flex, Heading, Text, Stack, Tag, Box, useMediaQuery} from '@chakra-ui/react'
import { Blur } from './CTA'

const HowItWork = () => {
  const [isMobile] = useMediaQuery('(max-width: 700px)')
  return (
    <>
      <Box id="how-it-works" position={'relative'}>
          <Stack spacing={{ base: 10, md: 20 }}>
            <Heading textAlign={'center'} lineHeight={1.1} fontSize={{ base: '3xl', sm: '4xl', md: '5xl', lg: '6xl' }}>
              <Box mt="60px" mb="30px">
                How it <Text as={'span'} color="white" bgColor="green.300">&nbsp;works&nbsp;</Text>?
              </Box>
            </Heading>
          </Stack>
          <Blur position={'absolute'} top={-10} right={10} style={{ filter: 'blur(70px)' }}/>
        </Box>
        <Container maxW={'5xl'} py={12}>
          <SimpleGrid id='ownership' mb="80px" mt="20px" columns={{ base: 1, md: 2 }} spacing={10}>
            <Stack spacing={4} textAlign="center" justifyContent="center">
              <Text textTransform={'uppercase'} color={'green.400'} fontWeight={600} fontSize={'sm'} bg="green.50" p={2} alignSelf={'center'} rounded={'md'}>
                Ownership
              </Text>
              <Heading>Create a new community</Heading>
              <Text color={'gray.500'} fontSize={'lg'}>Launch a new community on the Internet Computer. Ownership is transfer straight to your wallet.</Text>
            </Stack>
            <Flex>
              <Image src={require('../public/laptop-nature-cuate.png')} alt={'feature image'}/>
            </Flex>
          </SimpleGrid>
          <SimpleGrid  id='maintenance' mb="80px" mt="20px" columns={{ base: 1, md: 2 }} spacing={10}>
            <Flex>
              <Image src={require('../public/bike-travellers-cuate.png')} alt={'feature image'}/>
            </Flex>
            <Stack spacing={4} order={isMobile && -1} textAlign="center" justifyContent="center">
              <Text textTransform={'uppercase'} color={'green.400'} fontWeight={600} fontSize={'sm'} bg="green.50" p={2} alignSelf={'center'} rounded={'md'}>
                Maintenance
              </Text>
              <Heading>No servers involved</Heading>
              <Text color={'gray.500'} fontSize={'lg'}>You don't have to manage servers for your community on AWS or Google Cloud. You only need to fund the service depending on usage.</Text>
            </Stack>
          </SimpleGrid>
          <SimpleGrid id='management' mb="80px" mt="20px" columns={{ base: 1, md: 2 }} spacing={10}>
            <Stack spacing={4} textAlign="center" justifyContent="center">
              <Text textTransform={'uppercase'} color={'green.400'} fontWeight={600} fontSize={'sm'} bg="green.50" p={2} alignSelf={'center'} rounded={'md'}>
                Management
              </Text>
              <Heading>Tools to nurture and grow</Heading>
              <Text color={'gray.500'} fontSize={'lg'}> <Tag colorScheme="green">Coming soon</Tag> All the features you'd expect to manage a community. Tools to drop NFTs to your community wallet addresses.</Text>
            </Stack>
            <Flex>
              <Image src={require('../public/coffee-farm-cuate.png')} alt={'feature image'}/>
            </Flex>
          </SimpleGrid>
        </Container>
    </>
  )
}

export default HowItWork
