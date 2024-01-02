import { useEffect, useContext, useCallback } from 'react'
import { Box, Heading, Tag, Text, Flex, Divider, Button } from '@chakra-ui/react'
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'

import Jazzicon from 'react-jazzicon'
import Markdown from 'react-markdown'

import { timeSince } from '../utils/time'
import { addressShort, getAddress, getSeedFromAuthentication } from '../utils/address'

import { ChildContext } from '../store/child'
import { useNavigate } from 'react-router-dom'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye } from '@fortawesome/free-solid-svg-icons'
import { Principal } from '@dfinity/principal'

const Admin = () => {

  const { getPosts, childActor, updatePostStatus, updateReplyStatus } = useContext(ChildContext)
  const navigate = useNavigate()

  const replies = [{authentication: {Ic: {principal: Principal.fromText('aaaaa-aa')}}, reply_id: 15274483160242624476n, status: {Visible: null}, text: 'hello', timestamp: new Date()}]
  const posts = [{authentication: {Ic: {principal: Principal.fromText('aaaaa-aa')}}, post_id: 6037772836891108759n, status: {Visible: null}, title: 'hello', description: "### title \n this is a _new_ post", timestamp: new Date()}]

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

  const changeReplyVisibility = useCallback(async (replyId, statusType)=>{
    const post = {}
    const status = { [statusType]: null }
    const replyIndex = post.replies.findIndex(r => r.reply_id === replyId)
    post.replies[replyIndex].status = status
    setPost(p => ({...p, replies: [...post.replies]}))
    await updateReplyStatus(replyId, status)
  },[updateReplyStatus, setPost])

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
                  <Text ml="20px">{addressShort(getAddress(post.authentication))}</Text>
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

          {replies.map((reply) => 
          <Box key={reply.reply_id} mt="20px" border="1px" borderColor="gray.300" borderRadius="base">
            <Box _hover={{opacity: 0.7, cursor: 'pointer'}} onClick={() => goToPost(reply.reply_id)}>
              <Flex flexDirection={'row'} alignItems={'center'} ml="40px" mt="20px" mb="20px">
                <Jazzicon ml="40px" diameter={20} seed={getSeedFromAuthentication(reply?.authentication)} />
                <Text ml="5px" fontWeight="bold">{addressShort(getAddress(reply?.authentication) || '')}</Text>
                <Tag ml="10px" colorScheme='orange' size={'md'}>Hidden</Tag>
                <Text ml="auto" mr="40px">{timeSince(reply?.timestamp)}</Text>
              </Flex>
              <Box ml="40px" mb="20px" textAlign={'start'} className="markdown-body">
                <Markdown>{reply.text.substring(0, 100)}</Markdown>
              </Box>
            </Box>
            <Divider mb="10px"/>
            <Box>
              <Flex m="8px">
                <Button leftIcon={<FontAwesomeIcon icon={faEye} />}  onClick={() => changeReplyVisibility(reply.reply_id, 'Visible')} variant={'ghost'} ml="auto"> Restore Reply</Button>
              </Flex>
            </Box>
          </Box>
          )}
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
}
export default Admin
