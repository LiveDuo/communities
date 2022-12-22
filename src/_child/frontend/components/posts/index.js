import { memo, useContext, useEffect } from 'react'
import { Spinner, Box, SimpleGrid, Link, Heading } from '@chakra-ui/react'
import { shortenAddress } from '@usedapp/core'
import { Jazzicon } from '@ukstv/jazzicon-react'
import formatDistance from 'date-fns/formatDistance'
import { Link as RouterLink } from 'react-router-dom'

import { useENSName } from '../../utils/hooks'
import { PostsContext } from '../../store/posts'
import { IdentityContext } from '../../store/identity'

const Post = memo(({ data }) => {

  // console.log(data)

  const { ENSName } = useENSName(data.user_address)

  const timestamp = parseInt(data.timestamp.toString().substr(0, 13))
  const fromNow = formatDistance(timestamp, Date.now())
  return (
    <Box w='sm' borderWidth='1px' borderRadius='lg' p="20px" m="auto">
      <Heading p="8px" size="lg">{data.title}</Heading>
      <Box>
        <Box display="inline-block" mb="20px">{fromNow} ago</Box>
        <Box>
          <Link as={RouterLink} to={`/user/${data.user_address.toLowerCase()}`}>
            <Box w="16px" h="16px" display="inline-block" mr="8px">
              <Jazzicon address={data.user_address} />
            </Box>
            {ENSName || (data.user_address && shortenAddress(data.user_address))}
          </Link>
        </Box>
      </Box>
    </Box>
  )
})

const PostsContainer = ({principalId}) => {
  const { childActor } = useContext(IdentityContext)
  const { postsData, getPostsData, loading } = useContext(PostsContext)
  
  useEffect(() => {
    if (childActor) {
			getPostsData(principalId, 0)
    }
	}, [getPostsData, childActor, principalId])

  if (!postsData) return <Spinner/>
  return (
    postsData.length > 0
      ? <SimpleGrid flexDir="column" alignItems="center" columns={1} spacing={"10px"}>
          {postsData.map((post) => <Post key={post.id.toString()} data={post} />)}
          <Box mt="10px" key={'-1'}>{loading && <Spinner />}</Box>
      </SimpleGrid> 
      : <Box mt="20px">
        No posts!
      </Box>
    )
}
export default PostsContainer
