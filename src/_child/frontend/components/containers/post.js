import { useContext, useEffect, useState, useCallback } from 'react'
import { Spinner, Box, Heading } from '@chakra-ui/react'
import { Text, Flex, Button, Textarea, IconButton, Divider } from '@chakra-ui/react'
import Jazzicon from 'react-jazzicon'

import { timeSince } from '../../utils/time'
import { addressShort, getAddress, getSeedFromAuthentication } from '../../utils/address'


import { ArrowBackIcon } from '@chakra-ui/icons'

import { ChildContext } from '../../store/child'
import { IdentityContext } from '../../store/identity'

import { useNavigate, useParams } from 'react-router-dom'


const PostContainer = () => {
  const { account, principal, setSelectedNetwork, onWalletModalOpen } = useContext(IdentityContext)
  const { getPost, createReply, childActor } = useContext(ChildContext)
  
	const [replyText, setReplyText] = useState('')
	const [post, setPost] = useState()

  const navigate = useNavigate()
  const params = useParams()

  const goToPosts = async () => {
    navigate(`/`)
	}

  const getData = useCallback(async () => {
    const post_id = params.index
    const _post = await getPost(post_id)
    setPost({..._post, post_id})
  }, [getPost, params.index])

  const replyToPost = async (p) => {
    if (!(account && principal)) {
      setSelectedNetwork()
      onWalletModalOpen()
      return
    }

		setReplyText('')

		const reply = await createReply(p.post_id, replyText)
		
		setPost(h => ({...h, replies: [...h.replies, reply]}))
	}

  useEffect(() => {
    if (childActor) {
			getData()
    }
	}, [getData, childActor])

  if (!post) return <Spinner/>
  
  return <Box>
      {post ? 
        <Box mt="20px" padding="40px">
          <Flex mt="40px" mb="20px" justifyContent="center" alignItems="center">
            <IconButton icon={<ArrowBackIcon />} onClick={() =>goToPosts()}/>
            <Heading ml="40px" mr="auto" display="inline-block">{post.title}</Heading>
            <Text>{timeSince(post.timestamp)}</Text>
          </Flex>
          <Flex mb="20px" padding="20px 60px" alignItems="center">
            <Jazzicon diameter={20} seed={getSeedFromAuthentication(post.authentication)} />
            <Text ml="20px">{getAddress(post.authentication)}</Text>
          </Flex>
          <Box mb="40px" padding="20px 60px">
            <Text textAlign="start">{post.description}</Text>
          </Box>
          <Divider mb="10px"/>
          <Box mb="40px">
            {post.replies.length > 0 ? post.replies.map((r, i) => 
              <Flex key={i} alignItems="center" borderBottom="1px solid #00000010" padding="20px">
                <Box w="100px">
                  <Jazzicon diameter={40} seed={getSeedFromAuthentication(r?.authentication)} />
                </Box>
                <Box>

                <Text fontWeight="bold">{addressShort(getAddress(r?.authentication) || '')}</Text>
                <Text textAlign="start">{r.text}</Text>
                </Box>
                <Text ml="auto">{timeSince(r?.timestamp)}</Text>
              </Flex>
            ) : <Text textAlign="center">No replies yet</Text>}
          </Box>
          <Textarea mb="20px" height="140px" placeholder="Reply to the post" value={replyText} onChange={(e) => setReplyText(e.target.value)}/>
          <Box textAlign="end">
            <Button mr="20px" onClick={() => replyToPost(post)}>Submit</Button>
          </Box>
        </Box> :
        <Spinner/>}
    </Box>
}
export default PostContainer
