import { Spinner, Box, Link, Heading } from '@chakra-ui/react'
import { Text, Flex, Tooltip } from '@chakra-ui/react'
import Jazzicon from 'react-jazzicon'

import { timeSinceShort } from '../../utils/time'
import { getAddress, addressToName, getAuthenticationType, getSeedFromAuthentication, capitalizeFirstLetter } from '../../utils/address'

import { useNavigate, Link as RouterLink } from 'react-router-dom'

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
            <Text color="gray.500" width="120px" textAlign="center">Last Activity</Text>
            <Text color="gray.500" mr="40px" width="80px" textAlign="center">Replies</Text>
          </Flex>
          {posts.map((p, i) => 
            <Box opacity={p.status.hasOwnProperty('Hidden') ? '0.4' : '1'} key={i} margin="0 auto" mb="8px" borderBottom="1px solid #00000010" textAlign="start" padding="10px 40px" alignItems="center">
              <Flex alignItems="center">
                <Flex alignItems={'center'} mr="auto" _hover={{cursor: 'pointer', opacity: 0.7}} >
                  <Link href={!p.post_id ? '' : `/post/${p.post_id.toString()}`} onClick={(e) => {e.preventDefault(); !!p.post_id && goToPost(p.post_id.toString())}} _hover={{textDecor: 'none'}}  cursor={!p.post_id && 'not-allowed'}>
                    <Heading noOfLines={1} size="sm">{p.title}</Heading>
                    {/* <Text noOfLines={1}>{p.description}</Text> */}
                  </Link>
                  {!p.post_id && <Spinner ml="10px" size={'xs'}/>}
                </Flex>
                <Tooltip label={capitalizeFirstLetter(addressToName(getAddress(p?.authentication)))}>
                  <Link as={RouterLink} to={`/user/${getAuthenticationType(p?.authentication).toLocaleLowerCase()}/${getAddress(p?.authentication)}`}>
                    <Box width="40px" height="20px" textAlign="center" _hover={{cursor: 'pointer', opacity: 0.7}}>
                      <Jazzicon diameter={20} seed={getSeedFromAuthentication(p?.authentication)} />
                    </Box>
                  </Link>
                </Tooltip>
                <Text width="120px" textAlign="center">{timeSinceShort(p.last_activity)}</Text>
                <Text width="80px" textAlign="center">{p.replies_count.toString()}</Text>
              </Flex>
            </Box>)}
        </Box> : 
        <Text mt="20px">No posts yet</Text>}
    </Box>
}
export default PostsContainer
