import { Container, SimpleGrid, Image, Flex, Heading, Text, Stack } from '@chakra-ui/react'

const DATA = [
  {
    tag: 'Our Story',
    title: 'A digital Product design agency',
    context: 'Lorem ipsum dolor sit amet consetetur sadi pscing elitr sed diam nonumy eirmod tempor invidunt ut labore',
    image: {
      url: 'https://images.unsplash.com/photo-1554200876-56c2f25224fa?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
      alt: 'feature image'
    }
  },
  {
    tag: 'Our Story',
    title: 'A digital Product design agency',
    context: 'Lorem ipsum dolor sit amet consetetur sadi pscing elitr sed diam nonumy eirmod tempor invidunt ut labore',
    image: {
      url: 'https://images.unsplash.com/photo-1554200876-56c2f25224fa?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
      alt: 'feature image'
    }
  },
  {
    tag: 'Our Story',
    title: 'A digital Product design agency',
    context: 'Lorem ipsum dolor sit amet consetetur sadi pscing elitr sed diam nonumy eirmod tempor invidunt ut labore',
    image: {
      url: 'https://images.unsplash.com/photo-1554200876-56c2f25224fa?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
      alt: 'feature image'
    }
  },
]
const HowItWork = () => {
  return (
    <Container maxW={'5xl'} py={12}>
      {DATA.map(d => (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10}>
          <Stack spacing={4}>
            <Text textTransform={'uppercase'} color={'blue.400'} fontWeight={600} fontSize={'sm'} bg="blue.50" p={2} alignSelf={'flex-start'} rounded={'md'}>
              {d.tag}
            </Text>
            <Heading>A digital Product design agency</Heading>
            <Text color={'gray.500'} fontSize={'lg'}>{d.title}</Text>
          </Stack>
          <Flex>
            <Image
              rounded={'md'}
              alt={d.image.alt}
              src={d.image.url}
              objectFit={'cover'}
            />
          </Flex>
        </SimpleGrid>
      ))}
      
    </Container>
  )
}

export default HowItWork
