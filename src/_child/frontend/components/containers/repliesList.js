import { Spinner, Box, Link } from '@chakra-ui/react'
import { Text, Flex } from '@chakra-ui/react'

import { timeSinceShort } from '../../utils/time'

import { useNavigate } from 'react-router-dom'

const RepliesContainer = ({ replies }) => {
  
  const navigate = useNavigate()

  const goToPost = async (i) => {
    navigate(`/post/${i}`)
	}

  if (!replies) return <Spinner/>

  return  <Box mt="32px" textAlign="center" m="auto">
      {replies?.length > 0 ?
        <Box>
          <Flex mb="12px">
            <Text color="gray.500" ml="52px" mr="auto">Text</Text>
            <Text color="gray.500" width="80px" textAlign="center">Likes</Text>
            <Text color="gray.500" mr="40px" width="120px" textAlign="center">Time</Text>
          </Flex>
          {replies.map((p, i) => 
            <Box opacity={p.status.hasOwnProperty('Hidden') ? '0.4' : '1'} key={i} margin="0 auto" mb="8px" borderBottom="1px solid #00000010" textAlign="start" padding="10px 40px" alignItems="center">
              <Flex alignItems="center">
                <Flex alignItems={'center'} mr="auto" _hover={{cursor: 'pointer', opacity: 0.7}} >
                  <Link href={!p.postId ? '' : `/post/${p.postId.toString()}`} onClick={(e) => {e.preventDefault(); !!p.postId && goToPost(p.postId.toString())}} _hover={{textDecor: 'none'}}  cursor={!p.postId && 'not-allowed'}>
                    <Text noOfLines={1}>{p.text}</Text>
                  </Link>
                </Flex>
                <Text width="80px" textAlign="center">{p.likes.length}</Text>
                <Text width="120px" textAlign="center">{timeSinceShort(p.timestamp)} ago</Text>
              </Flex>
            </Box>)}
        </Box> : 
        <Text mt="20px">No replies yet</Text>}
    </Box>
}
export default RepliesContainer
