import { useEffect, useContext, useCallback, useState } from 'react'
import { Box, Heading, Tag, Text, Flex, Divider, Button } from '@chakra-ui/react'
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'

import Jazzicon from 'react-jazzicon'
import Markdown from 'react-markdown'

import { timeSince } from '../utils/time'
import { addressShorter, getAddress, getSeedFromAuthentication } from '../utils/address'

import { ChildContext } from '../store/child'
import { useNavigate } from 'react-router-dom'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye } from '@fortawesome/free-solid-svg-icons'

const Admin = () => {

  const { getHiddenPosts, getHiddenReplies, childActor, updatePostStatus, updateReplyStatus } = useContext(ChildContext)
  const navigate = useNavigate()

  const [posts, setPosts] = useState()
  const [replies, setReplies] = useState()

  const getData = useCallback(async () => {    
    const _posts = await getHiddenPosts()
    setPosts(_posts)
    const _replies = await getHiddenReplies()
    setReplies(_replies)
  }, [getHiddenReplies,getHiddenPosts])

  useEffect(()=>{
    if (childActor) {
      getData()
    }
  },[getData, childActor])

  const goToPost = (postId) => {
    navigate(`/post/${postId}`)
  }

  const changePostVisibility = useCallback(async (postId)=>{
    const status = { Visible: null }
    setPosts(posts => posts.filter(p =>p.post_id !== postId))
    await updatePostStatus(postId, status)
  },[updatePostStatus, setPosts])

  const changeReplyVisibility = useCallback(async (replyId)=>{
    const status = { Visible: null }
    setReplies(replies => replies.filter(r => r.reply_id !== replyId))
    await updateReplyStatus(replyId, status)
  },[updateReplyStatus, setReplies])

  return (
    <Tabs>
      <TabList>
        <Tab>Posts</Tab>
        <Tab>Replies</Tab>
      </TabList>

      <TabPanels>
        <TabPanel>

          {posts?.length > 0  ? 
          <>
              {posts.map(post => 
                <Box key={post.post_id} mt="20px" border="1px" borderColor="gray.300" borderRadius="base">
                  <Box _hover={{opacity: 0.7, cursor: 'pointer'}} onClick={() => goToPost(post.post_id)}>
                    <Flex mt="40px" mb="28px" justifyContent="center" alignItems="center">
                      <Heading ml="40px" display="inline-block">{post.title}</Heading>
                      <Tag ml="10px" colorScheme='orange' size={'md'}>Hidden</Tag>
                      <Flex ml="auto" alignItems="center">
                        <Jazzicon diameter={20} seed={getSeedFromAuthentication(post.authentication)} />
                        <Text ml="20px">{addressShorter(getAddress(post.authentication))}</Text>
                      </Flex>
                      <Text ml="40px" mr="40px">{timeSince(post.timestamp)}</Text>
                    </Flex>
                    <Box mb="28px" ml="60px" >
                      <Box textAlign="start" className="markdown-body">
                        <Markdown>{post.description.substring(0, 200)}</Markdown>
                      </Box>
                    </Box>
                  </Box>
                  <Divider/>
                  <Flex m="10px">
                    <Button leftIcon={<FontAwesomeIcon icon={faEye} />}  onClick={() => changePostVisibility(post.post_id)} variant={'ghost'} ml="auto"> Restore Post</Button>
                  </Flex>
                </Box>)} 
              </>
              : <Text mt="20px">No hidden posts yet</Text> }
        </TabPanel>
        <TabPanel>
        {replies?.length > 0  ? 
          <>
            {replies.map((reply) => 
              <Box key={reply.reply_id} mt="20px" border="1px" borderColor="gray.300" borderRadius="base">
                <Box _hover={{opacity: 0.7, cursor: 'pointer'}} onClick={() => goToPost(reply.postId)}>
                  <Flex flexDirection={'row'} alignItems={'center'} ml="40px" mt="20px" mb="20px">
                    <Jazzicon ml="40px" diameter={20} seed={getSeedFromAuthentication(reply?.authentication)} />
                    <Text ml="5px" fontWeight="bold">{addressShorter(getAddress(reply?.authentication) || '')}</Text>
                    <Tag ml="10px" colorScheme='orange' size={'md'}>Hidden</Tag>
                    <Text ml="auto" mr="40px">{timeSince(reply?.timestamp)}</Text>
                  </Flex>
                  <Box ml="40px" mb="20px" textAlign={'start'} className="markdown-body">
                    <Markdown>{reply.text.substring(0, 100)}</Markdown>
                  </Box>
                </Box>
                <Divider/>
                <Box>
                  <Flex m="10px">
                    <Button leftIcon={<FontAwesomeIcon icon={faEye} />}  onClick={() => changeReplyVisibility(reply.reply_id)} variant={'ghost'} ml="auto"> Restore Reply</Button>
                  </Flex>
                </Box>
              </Box>)}
            </>
          : <Text mt="20px">No hidden replies yet</Text> }
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
}
export default Admin
