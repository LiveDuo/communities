import { useEffect, useContext, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Text } from '@chakra-ui/react'

import PostsContainer from '../components/containers/posts'
import { ChildContext } from '../store/child'
import { timeSince } from '../utils/time'
import { capitalizeFirstLetter } from '../utils/address'

const Profile = () => {
  const { address, type } = useParams()
  
  const { getProfileByAuth, getPostsByAuth, postsUser, childActor,  getMostLikedPosts, getMostLikedReplies } = useContext(ChildContext)
  
  const [mostLikedPosts, setMostLikedPosts] = useState() 
  const [mostLikedReplies, setMostLikedReplies] = useState() 

  const loadMostLikedPosts = useCallback(async () => {
    const mostLikedPosts = await getMostLikedPosts(address, capitalizeFirstLetter(type))
    setMostLikedPosts(mostLikedPosts)
  },[getMostLikedPosts, address, type])
  
  const loadMostLikedReplies = useCallback(async () => {
    const replies = await getMostLikedReplies(address, capitalizeFirstLetter(type))
    setMostLikedReplies(replies)
  },[getMostLikedReplies, address, type])

  useEffect(() => {
    if (address) {
      getProfileByAuth(address, capitalizeFirstLetter(type))
    }
  }, [getProfileByAuth, address, type])

  useEffect(() => {
    if (childActor) {
      getPostsByAuth(address, capitalizeFirstLetter(type))
      loadMostLikedPosts()
      loadMostLikedReplies()
    }
  },[childActor, getPostsByAuth, address, type, loadMostLikedPosts, loadMostLikedReplies])

  return (
    <Box>
      <Box mb="40px">
        <PostsContainer posts={postsUser} />
      </Box>
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
export default Profile
