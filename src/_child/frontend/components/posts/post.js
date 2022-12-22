import { useContext, useEffect, useState, useCallback } from 'react'
import { Spinner, Box, Heading } from '@chakra-ui/react'
import { Text, Flex, Button, Textarea, IconButton, Divider } from '@chakra-ui/react'
import Jazzicon from 'react-jazzicon'

import { timeSince } from '../../utils/time'

import { ArrowBackIcon } from '@chakra-ui/icons'

import { ChildContext } from '../../store/child'
import { IdentityContext } from '../../store/identity'

import { useNavigate, useParams } from 'react-router-dom'

const principalShort = (a) => `${a.toString().substring(0, 18)}...${a.toString().substring(63 - 10, 63)}`

const PostContainer = () => {
  const { childActor } = useContext(IdentityContext)
  const { getPost, createReply } = useContext(ChildContext)
  
	const [replyText, setReplyText] = useState('')
	const [post, setPost] = useState()

  const navigate = useNavigate()
  const params = useParams()

  const goToPosts = async () => {
    navigate(`/`)
	}

  const getData = useCallback(async () => {
    const index = Number(params.index)
    const _post = await getPost(index)
    setPost({..._post, index})
  }, [getPost, params.index])

  const replyToPost = async (p) => {

		setReplyText('')

		const reply = await createReply(p.index, replyText)
		
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
          <Flex mt="40px" mb="40px" justifyContent="center" alignItems="center">
            <IconButton icon={<ArrowBackIcon />} onClick={() =>goToPosts()}/>
            <Heading ml="40px" mr="auto" display="inline-block">{post.title}</Heading>
            <Text>{timeSince(post.timestamp)}</Text>
          </Flex>
          <Box mb="40px" padding="20px 60px">
            <Text textAlign="start">{post.description}</Text>
          </Box>
          <Divider mb="10px"/>
          <Box mb="40px">
            {post.replies.length > 0 ? post.replies.map((r, i) => 
              <Flex key={i} alignItems="center" borderBottom="1px solid #00000010" padding="20px">
                <Box w="100px">
                  <Jazzicon diameter={40} seed={r.caller.toString()} />
                </Box>
                <Box>

                <Text fontWeight="bold">{principalShort(r.caller)}</Text>
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