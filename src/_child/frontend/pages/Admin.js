import { useEffect, useContext, useCallback } from 'react'
import { Box, Heading, Tag, Text, Flex, Divider, Button } from '@chakra-ui/react'
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'

import Jazzicon from 'react-jazzicon'
import Markdown from 'react-markdown'

import { timeSince } from '../utils/time'
import { getAddress, getSeedFromAuthentication } from '../utils/address'

import { ChildContext } from '../store/child'
import { useNavigate } from 'react-router-dom'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye } from '@fortawesome/free-solid-svg-icons'

const Admin = () => {

  const { getPosts, posts, childActor, updatePostStatus } = useContext(ChildContext)
  const navigate = useNavigate()

  // TODO fix
  const setPost = useCallback(() => {}, [])

  useEffect(()=>{
    if (childActor)
      getPosts()
  },[getPosts, childActor])

  const goToPost = (postId) => {
    navigate(`/post/${postId}`)
  }

  const changePostVisibility = useCallback(async (postId, statusType)=>{
    const status = { [statusType]: null }
    setPost(p => ({...p, status: status}))
    await updatePostStatus(postId, status)
  },[updatePostStatus, setPost])

  return (
    <Tabs>
      <TabList>
        <Tab>Posts</Tab>
        <Tab>Replies</Tab>
      </TabList>

      <TabPanels>
        <TabPanel>

          {posts?.map(post => 
            <Box key={post.post_id} mt="20px" border="1px" borderColor="gray.300" borderRadius="base">
              <Box _hover={{opacity: 0.7, cursor: 'pointer'}} onClick={() => goToPost(post.post_id)}>
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
                    <Markdown>{post.description.substring(0, 200)}</Markdown>
                  </Box>
                </Box>
              </Box>
              <Divider mb="10px"/>
              <Flex m="8px">
                <Button leftIcon={<FontAwesomeIcon icon={faEye} />}  onClick={() => changePostVisibility(post.post_id, 'Visible')} variant={'ghost'} ml="auto"> Restore Post</Button>
              </Flex>
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
