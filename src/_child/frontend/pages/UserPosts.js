import { useEffect, useContext } from 'react'
import { useParams } from 'react-router-dom'
import { Box } from '@chakra-ui/react'

import PostsContainer from '../components/containers/posts'
// import UserInfo from '../components/user/UserInfo'
import { ChildContext } from '../store/child'
import { IdentityContext } from '../store/identity'

const UserPost = () => {
  const { address, type } = useParams()

  const { getProfileByAuth, getPostsByUser, postsUser } = useContext(ChildContext)
  const { childActor } = useContext(IdentityContext)

  useEffect(() => {
    if (address) {
      getProfileByAuth({address, type})
    }
  }, [getProfileByAuth, address, type])

  useEffect(() => {
    if (childActor)
      getPostsByUser()
  },[childActor, getPostsByUser])


  return (
    <Box>
      <Box mb="40px">
      </Box>
      <PostsContainer posts={postsUser} />
    </Box>
  )
}
export default UserPost
