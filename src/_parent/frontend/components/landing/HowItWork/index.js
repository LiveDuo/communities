import { Container, SimpleGrid, Image, Flex, Heading, Text, Stack, Tag, Box, useMediaQuery} from '@chakra-ui/react'
import { Blur } from '../CTA'
const HowItWork = () => {
  const [isMobile] = useMediaQuery('(max-width: 700px)')
  return (
    <>
    <Box position={'relative'}>
        <Stack spacing={{ base: 10, md: 20 }}>
          <Heading textAlign={'center'} lineHeight={1.1} fontSize={{ base: '3xl', sm: '4xl', md: '5xl', lg: '6xl' }}>
            <Box mt="60px" mb="30px">
              Digital <Text as={'span'} color="white" bgColor="green.300">&nbsp;spaces&nbsp;</Text>
            </Box>
            <Box>
              <Text as={'span'} color="green.300" bgColor="white">&nbsp;Owned&nbsp;</Text> by creators
            </Box>
          </Heading>
        </Stack>
        <Blur position={'absolute'} top={-10} right={-10} style={{ filter: 'blur(70px)' }}/>
      </Box>
    <Container maxW={'5xl'} py={12}>
      <SimpleGrid mb="200px" mt="20px" columns={{ base: 1, md: 2 }} spacing={10}>
        <Stack spacing={4}>
          <Text textTransform={'uppercase'} color={'green.400'} fontWeight={600} fontSize={'sm'} bg="green.50" p={2} alignSelf={'flex-start'} rounded={'md'}>
            Ownership
          </Text>
          <Heading>Create a new community</Heading>
          <Text color={'gray.500'} fontSize={'lg'}>Launch a new community on the Internet Computer. Ownership is transfer straight to your wallet.</Text>
        </Stack>
        <Flex>
          <Image
            rounded={'md'}
            alt={'feature image'}
            src={'https://images.unsplash.com/photo-1554200876-56c2f25224fa?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'}
            objectFit={'cover'}
          />
        </Flex>
      </SimpleGrid>
      <SimpleGrid mb="200px" mt="20px" columns={{ base: 1, md: 2 }} spacing={10}>
        <Flex>
          <Image
            rounded={'md'}
            alt={'feature image'}
            src={'https://images.unsplash.com/photo-1554200876-56c2f25224fa?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'}
            objectFit={'cover'}
          />
        </Flex>
        <Stack spacing={4} order={isMobile && -1}>
          <Text textTransform={'uppercase'} color={'green.400'} fontWeight={600} fontSize={'sm'} bg="green.50" p={2} alignSelf={'flex-start'} rounded={'md'}>
            Maintenance
          </Text>
          <Heading>No servers involved</Heading>
          <Text color={'gray.500'} fontSize={'lg'}>You don't have to manage servers for your community on AWS or Google Cloud. You only need to fund the service depending on usage.</Text>
        </Stack>
      </SimpleGrid>
      <SimpleGrid mb="200px" mt="20px" columns={{ base: 1, md: 2 }} spacing={10}>
        <Stack spacing={4}>
          <Text textTransform={'uppercase'} color={'green.400'} fontWeight={600} fontSize={'sm'} bg="green.50" p={2} alignSelf={'flex-start'} rounded={'md'}>
            Management
          </Text>
          <Heading>Tools to nurture and grow</Heading>
          <Text color={'gray.500'} fontSize={'lg'}> <Tag colorScheme="green">Coming soon</Tag> All the features you'd expect to manage a community. Tools to drop NFTs to your community wallet addresses.</Text>
        </Stack>
        <Flex>
          <Image
            rounded={'md'}
            alt={'feature image'}
            src={'https://images.unsplash.com/photo-1554200876-56c2f25224fa?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'}
            objectFit={'cover'}
          />
        </Flex>
      </SimpleGrid>
      
    </Container>
    </>
  )
}

export default HowItWork
