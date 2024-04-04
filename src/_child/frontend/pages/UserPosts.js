import { useEffect, useContext, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Text } from '@chakra-ui/react'

import PostsContainer from '../components/containers/posts'
// import UserInfo from '../components/user/UserInfo'
import { ChildContext } from '../store/child'
import { timeSince } from '../utils/time'

const UserPost = () => {
  const [mostLikedPosts, setMostLikedPosts] = useState() 
  const [mostLikedReplies, setMostLikedReplies] = useState() 
  const { address, type } = useParams()

  const { getProfileByAuth, getPostsByAuth, postsUser, childActor,  getMostLikedPosts, getMostLikedReplies } = useContext(ChildContext)

  const getData = useCallback(async () => {
    const posts = await getMostLikedPosts(address, type)
    setMostLikedPosts(posts)
    const replies = await getMostLikedReplies(address, type)
    setMostLikedReplies(replies)
  },[getMostLikedPosts, getMostLikedReplies, address, type])

  useEffect(() => {
    if (address) {
      getProfileByAuth(address, type)
    }
  }, [getProfileByAuth, address, type])

  useEffect(() => {
    if (childActor) {
      getPostsByAuth(address, type)
      getData()
    }
  },[childActor, getPostsByAuth, address, type, getData])

  return (
    <Box>
      <Box mb="40px">
      </Box>
      <PostsContainer posts={postsUser} />
      <Box>
        {mostLikedPosts && mostLikedPosts.map((p, i)=> (
          <Box key={i}>
            <Text>{p.title}</Text>
            <Text>{p.description}</Text>
            <Text>{timeSince(p.timestamp)}</Text>
          </Box>
        ))}
      </Box>
      <Box>
        {mostLikedReplies && mostLikedReplies.map((p, i)=> (
          <Box key={i}>
            <Text>{p.text}</Text>
            <Text>{timeSince(p.timestamp)}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
export default UserPost
