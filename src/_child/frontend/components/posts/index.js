import { useContext, useEffect, useState } from 'react'
import { Spinner, Box, Link, Heading } from '@chakra-ui/react'
import { Text, Flex, Button, useDisclosure, Textarea, Tooltip, IconButton, Divider } from '@chakra-ui/react'
import Jazzicon from 'react-jazzicon'

import PostModal from '../../components/modals/PostModal'
import { timeSince, timeSinceShort } from '../../utils/time'

import { EditIcon, ArrowBackIcon } from '@chakra-ui/icons'

import { ChildContext } from '../../store/child'
import { IdentityContext } from '../../store/identity'

const principalShort = (a) => `${a.toString().substring(0, 18)}...${a.toString().substring(63 - 10, 63)}`
const getExplorerUrl = (principal) => `https://www.icscan.io/principal/${principal}`

// import { timeSince, timeSinceShort } from '../../utils'

// const Post = memo(({ data }) => {

//   // console.log(data)

//   const { ENSName } = useENSName(data.user_address)

//   const timestamp = parseInt(data.timestamp.toString().substr(0, 13))
//   const fromNow = formatDistance(timestamp, Date.now())
//   return (
//     <Box w='sm' borderWidth='1px' borderRadius='lg' p="20px" m="auto">
//       <Heading p="8px" size="lg">{data.title}</Heading>
//       <Box>
//         <Box display="inline-block" mb="20px">{fromNow} ago</Box>
//         <Box>
//           <Link as={RouterLink} to={`/user/${data.user_address.toLowerCase()}`}>
//             <Box w="16px" h="16px" display="inline-block" mr="8px">
//               <Jazzicon seed={data.user_address} />
//             </Box>
//             {ENSName || (data.user_address && shortenAddress(data.user_address))}
//           </Link>
//         </Box>
//       </Box>
//     </Box>
//   )
// })

const PostsContainer = ({principalId}) => {
  const { childActor } = useContext(IdentityContext)
  const { posts, getPosts, createPost, getPost, replyToPost } = useContext(ChildContext)
  
	const [replyText, setReplyText] = useState('')
	const [showSubpage, setShowSubpage] = useState(false)
	const [post, setPost] = useState()
  const { isOpen: isPostOpen, onOpen: onPostOpen, onClose: onPostClose } = useDisclosure()

  const goToPosts = async () => {
		setShowSubpage(false)
		// history.pushState('', '', `/`)

		setPost(null)
	}

  const goToPost = async (i) => {

		setShowSubpage(true)

		// history.pushState('', '', `/post/${i}`)

		const _post = await getPost(i)
		setPost({..._post, index: i})
	}

  useEffect(() => {
    if (childActor) {
			getPosts(principalId, 0)
    }
	}, [getPosts, childActor, principalId])

  if (!posts) return <Spinner/>
  // return (
  //   posts.length > 0
  //     ? <SimpleGrid flexDir="column" alignItems="center" columns={1} spacing={"10px"}>
  //         {posts.map((post) => <Post key={post.id.toString()} data={post} />)}
  //         <Box mt="10px" key={'-1'}>{loading && <Spinner />}</Box>
  //     </SimpleGrid> 
  //     : <Box mt="20px">
  //       No posts!
  //     </Box>
  //   )

  return !showSubpage ? 
    <Box mt="32px" textAlign="center" m="auto">
      
      <Button mt="28px" leftIcon={<EditIcon />} mb="28px" w="200px" onClick={onPostOpen}>New Post</Button>
      <PostModal isOpen={isPostOpen} onClose={onPostClose} onDone={createPost}/>
      

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
                  <Link href={`/discuss/${i}`} onClick={(e) => {e.preventDefault(); goToPost(i)}} _hover={{textDecor: 'none'}}>
                    <Heading noOfLines={1} size="sm">{p.title}</Heading>
                    <Text noOfLines={1}>{p.description}</Text>
                  </Link>
                </Box>
                <Tooltip label={principalShort(p.caller)}>
                  <Link href={getExplorerUrl(p.caller)} isExternal>
                    <Box width="40px" height="20px" textAlign="center" _hover={{cursor: 'pointer', opacity: 0.7}}>
                      <Jazzicon diameter={20} seed={p.caller.toString()} />
                    </Box>
                  </Link>
                </Tooltip>
                <Text width="120px" textAlign="center">{timeSinceShort((+p.last_activity > 0) ? p.last_activity : p.timestamp)}</Text>
                <Text width="80px" textAlign="center">{p.replies_count.toString()}</Text>
              </Flex>
            </Box>)}
        </Box> : 
        <Text mt="20px">No posts yet</Text>}
    </Box> : 
    <Box>
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
export default PostsContainer
