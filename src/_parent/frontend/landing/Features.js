import { Box, Container, Flex, Heading, Stack, Text, Image } from '@chakra-ui/react';

const Card = ({ heading, description, image }) => {
  return (
    <Box maxW={{ base: 'full', md: '275px' }} w={'full'} borderWidth="1px" borderRadius="lg" overflow="hidden" p={5} textAlign="center">
      <Stack align={'center'} spacing={2}>
          {image}
        <Box mt={6}>
          <Heading size="md">{heading}</Heading>
          <Text mt={1} fontSize={'sm'}>{description}</Text>
        </Box>
      </Stack>
    </Box>
  );
};


const Features = () =>  {
  return (
    <Box id='features' p={4} mb="100px">
      <Stack spacing={4} as={Container} maxW={'3xl'} textAlign={'center'}>
        <Heading fontSize={{ base: '2xl', sm: '4xl' }} fontWeight={'bold'}>
          What is included?
        </Heading>
        <Text color={'gray.600'} fontSize={{ base: 'sm', sm: 'lg' }}>
          Easy to deploy, with a single click and a few ICP tokens. Simple to use, transactions don't need to be signed for every user action.
        </Text>
      </Stack>

      <Container maxW={'5xl'} mt={12}>
        <Flex flexWrap="wrap" gridGap={6} justify="center">
          <Card
            heading={'Wallet Login'}
            image={<Image src={require('../public/backpack-icon.png')} alt={'feature icon'} width="160px"/>}
            description={'Login with Metamask, Phantom or Plug wallet.'}
          />
          <Card
            heading={'Free for users'}
            image={<Image src={require('../public/bag-icon.png')} alt={'feature icon'} width="160px"/>}
            description={'Users don\'t have to pay transaction fees to interact.'}
          />
          <Card
            heading={'Owned by creators'}
            image={<Image src={require('../public/ball-icon.png')} alt={'feature icon'} width="160px"/>}
            description={'Creators have 100% ownership of the communities they create.'}
          />
          <Card
            heading={'Runs on blockchain'}
            image={<Image src={require('../public/plants-icon.png')} alt={'feature icon'} width="160px"/>}
            description={'All actions are carried out by 13 nodes.'}
          />
          <Card
            heading={'Easy to deploy'}
            image={<Image src={require('../public/coffee-icon.png')} alt={'feature icon'} width="160px"/>}
            description={'You can create new communities with only one click.'}
          />
        </Flex>
      </Container>
    </Box>
  );
}

export default Features