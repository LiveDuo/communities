import { useContext } from 'react'
import { Spinner, Box, Link, Heading } from '@chakra-ui/react'
import { Text, Flex, Button, useDisclosure, Tooltip } from '@chakra-ui/react'
import Jazzicon from 'react-jazzicon'

import PostModal from '../modals/PostModal'
import { timeSinceShort } from '../../utils/time'
import { getAddress, addressShort, getExplorerUrl, getSeedFromAuthentication } from '../../utils/address'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'

import { ChildContext } from '../../store/child'
import { IdentityContext } from '../../store/identity'

import { useNavigate } from 'react-router-dom'

const PostsContainer = ({ posts }) => {
  const {  createPost } = useContext(ChildContext)
  const {  account, principal, onWalletModalOpen, setSelectedNetwork} = useContext(IdentityContext)
  
  const { isOpen: isPostOpen, onOpen: onPostOpen, onClose: onPostClose } = useDisclosure()
  const navigate = useNavigate()

  const goToPost = async (i) => {
    navigate(`/post/${i}`)
	}

  const onCreatePost = () => {
    if (!(account && principal)) {
      setSelectedNetwork()
      onWalletModalOpen()
      return
    }
    onPostOpen()
  }


  if (!posts) return <Spinner/>

  return  <Box mt="32px" textAlign="center" m="auto">

      <Button mt="28px" leftIcon={<FontAwesomeIcon icon={faPenToSquare} />} mb="28px" w="200px" onClick={onCreatePost}>New Post</Button>
      <PostModal isOpen={isPostOpen} onClose={onPostClose} createPost={createPost}/>
      
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
                <Tooltip label={addressShort(getAddress(p?.authentication))}>
                  <Link href={getExplorerUrl(p.authentication)} isExternal>
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
