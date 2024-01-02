import { useEffect, useContext } from 'react'
import { Box, Heading, Tag, Text, Flex } from '@chakra-ui/react'
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'

import Jazzicon from 'react-jazzicon'
import Markdown from 'react-markdown'

import { timeSince } from '../utils/time'
import { getAddress, getSeedFromAuthentication } from '../utils/address'

import { ChildContext } from '../store/child'

const Admin = () => {

  const { getPosts, posts, childActor } = useContext(ChildContext)

  useEffect(()=>{
    if (childActor)
      getPosts()
  },[getPosts, childActor])

  return (
    <Tabs>
      <TabList>
        <Tab>Posts</Tab>
        <Tab>Replies</Tab>
      </TabList>

      <TabPanels>
        <TabPanel>

          {posts.map(post => 
            <Box mt="20px" border="1px" borderColor="gray.300" borderRadius="base">
              <Flex mt="40px" mb="20px" justifyContent="center" alignItems="center">
                <Heading ml="40px" display="inline-block">{post.title}</Heading>
                <Tag ml="10px" colorScheme='orange' size={'md'}>Hidden</Tag>
                <Text ml="auto" mr="40px">{timeSince(post.timestamp)}</Text>
              </Flex>
              <Flex mb="20px" padding="20px 60px" alignItems="center">
                <Jazzicon diameter={20} seed={getSeedFromAuthentication(post.authentication)} />
                <Text ml="20px">{getAddress(post.authentication)}</Text>
              </Flex>
              <Box mb="40px" padding="20px 60px">
                <Box textAlign="start" className="markdown-body">
                  <Markdown>{post.description}</Markdown>
                </Box>
              </Box>
            </Box>)}
        </TabPanel>
        <TabPanel>
          <Box>Replies</Box>
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
}
export default Admin
