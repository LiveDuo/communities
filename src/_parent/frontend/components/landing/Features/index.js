import { Box, Container, Flex, Heading, Icon, Stack, Text, useColorModeValue } from '@chakra-ui/react';
import { FcAbout, FcAssistant, FcCollaboration, FcDonate, FcManager, } from 'react-icons/fc';

const Card = ({ heading, description, icon }) => {
  return (
    <Box maxW={{ base: 'full', md: '275px' }} w={'full'} borderWidth="1px" borderRadius="lg" overflow="hidden" p={5} textAlign="center">
      <Stack align={'center'} spacing={2}>
        <Flex w={16} h={16} mb="12px" align={'center'} justify={'center'} color={'white'} rounded={'full'} bg={useColorModeValue('gray.100', 'gray.700')}>
          {icon}
        </Flex>
        <Box mt={2}>
          <Heading size="md">{heading}</Heading>
          <Text mt={1} fontSize={'sm'}>{description}</Text>
        </Box>
      </Stack>
    </Box>
  );
};


const Features = () =>  {
  return (
    <Box p={4} mb="100px">
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
            icon={<Icon as={FcAssistant} w={10} h={10} />}
            description={'Login with Metamask, Phantom or Plug wallet.'}
          />
          <Card
            heading={'Free for users'}
            icon={<Icon as={FcCollaboration} w={10} h={10} />}
            description={'Users don\'t have to pay transaction fees to interact.'}
          />
          <Card
            heading={'Owned by creators'}
            icon={<Icon as={FcDonate} w={10} h={10} />}
            description={'Creators have 100% ownership of the communities they create.'}
          />
          <Card
            heading={'Runs on blockchain'}
            icon={<Icon as={FcManager} w={10} h={10} />}
            description={'All actions are carried out by 13 nodes.'}
          />
          <Card
            heading={'Easy to deploy'}
            icon={<Icon as={FcAbout} w={10} h={10} />}
            description={'You can create new communities with only one click.'}
          />
        </Flex>
      </Container>
    </Box>
  );
}

export default Features