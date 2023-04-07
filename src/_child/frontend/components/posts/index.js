import { useContext, useEffect } from 'react'
import { Spinner, Box, Link, Heading } from '@chakra-ui/react'
import { Text, Flex, Button, useDisclosure, Tooltip } from '@chakra-ui/react'
import Jazzicon from 'react-jazzicon'

import PostModal from '../../components/modals/PostModal'
import { timeSinceShort } from '../../utils/time'

import { EditIcon } from '@chakra-ui/icons'

import { ChildContext } from '../../store/child'
import { IdentityContext } from '../../store/identity'

import { useNavigate } from 'react-router-dom'

const addressShort = (a) => `${a.substring(0, 8)}...${a.substring(42 - 6, 42)}`
const getExplorerUrl = (principal) => `https://etherscan.io/address/${principal}`

const PostsContainer = () => {
  const { childActor } = useContext(IdentityContext)
  const { posts, getPosts, createPost } = useContext(ChildContext)
  
  const { isOpen: isPostOpen, onOpen: onPostOpen, onClose: onPostClose } = useDisclosure()
  const navigate = useNavigate()

  const goToPost = async (i) => {
    navigate(`/post/${i}`)
	}

  useEffect(() => {
    if (childActor) {
			getPosts()
    }
	}, [getPosts, childActor])

  if (!posts) return <Spinner/>

  return  <Box mt="32px" textAlign="center" m="auto">

      <Button mt="28px" leftIcon={<EditIcon />} mb="28px" w="200px" onClick={onPostOpen}>New Post</Button>
      <PostModal isOpen={isPostOpen} onClose={onPostClose} createPost={createPost}/>
      
      {posts?.length > 0 ?
        <Box>
          <Flex mb="12px">
            <Text color="gray.500" ml="52px" mr="auto">Topic</Text>
            <Text color="gray.500" width="120px" textAlign="center">Last Activity</Text>
            <Text color="gray.500" mr="40px" width="80px" textAlign="center">Replies</Text>
          </Flex>
          {posts?.map((p, i) => 
            <Box key={i} margin="0 auto" mb="8px" borderBottom="1px solid #00000010" textAlign="start" padding="10px 40px" alignItems="center">
              <Flex alignItems="center">
                <Box mr="auto" _hover={{cursor: 'pointer', opacity: 0.7}} >
                  <Link href={`/post/${p.post_id.toString()}`} onClick={(e) => {e.preventDefault(); goToPost(p.post_id.toString())}} _hover={{textDecor: 'none'}}>
                    <Heading noOfLines={1} size="sm">{p.title}</Heading>
                    <Text noOfLines={1}>{p.description}</Text>
                  </Link>
                </Box>
                <Tooltip label={addressShort(p?.address ?? '')}>
                  <Link href={getExplorerUrl(p.address)} isExternal>
                    <Box width="40px" height="20px" textAlign="center" _hover={{cursor: 'pointer', opacity: 0.7}}>
                      <Jazzicon diameter={20} seed={p.address} />
                    </Box>
                  </Link>
                </Tooltip>
                <Text width="120px" textAlign="center">{timeSinceShort(p.last_activity ?? p.timestamp)}</Text>
                <Text width="80px" textAlign="center">{p.replies_count.toString()}</Text>
              </Flex>
            </Box>)}
        </Box> : 
        <Text mt="20px">No posts yet</Text>}
    </Box>
}
export default PostsContainer
