import { Spinner, Box, Link, Heading } from '@chakra-ui/react'
import { Text, Flex } from '@chakra-ui/react'

import { useNavigate } from 'react-router-dom'

import { timeSinceShort } from '../../utils/time'

const PostsContainer = ({ posts }) => {
  
  const navigate = useNavigate()

  const goToPost = async (i) => {
    navigate(`/post/${i}`)
	}

  if (!posts) return <Spinner/>

  return  <Box mt="32px" textAlign="center" m="auto">
      {posts?.length > 0 ?
        <Box>
          <Flex mb="12px">
            <Text color="gray.500" ml="52px" mr="auto">Topic</Text>
            <Text color="gray.500" width="80px" textAlign="center">Replies</Text>
            <Text color="gray.500" width="80px" textAlign="center">Likes</Text>
            <Text color="gray.500" mr="40px" width="120px" textAlign="center">Time</Text>
          </Flex>
          {posts.map((p, i) => 
            <Box key={i} margin="0 auto" mb="8px" borderBottom="1px solid #00000010" textAlign="start" padding="10px 40px" alignItems="center">
              <Flex alignItems="center">
                <Flex alignItems={'center'} mr="auto" _hover={{cursor: 'pointer', opacity: 0.7}} >
                  <Link href={`/post/${p.post_id.toString()}`} onClick={(e) => {e.preventDefault(); goToPost(p.post_id.toString())}} _hover={{textDecor: 'none'}}  cursor={!p.post_id && 'not-allowed'}>
                    <Heading noOfLines={1} size="sm">{p.title}</Heading>
                    <Text noOfLines={1}>{p.description}</Text>
                  </Link>
                </Flex>
                <Text width="80px" textAlign="center">{p.replies?.length ?? 0}</Text>
                <Text width="80px" textAlign="center">{p.likes?.length ?? 0}</Text>
                <Text width="120px" textAlign="center">{timeSinceShort(p.timestamp)} ago</Text>
              </Flex>
            </Box>)}
        </Box> : 
        <Text mt="20px">No posts yet</Text>}
    </Box>
}
export default PostsContainer
