import { useEffect, useContext } from 'react'
import { Box } from '@chakra-ui/react'

import PostsContainer from '../components/containers/posts'
// import WritePost from '../components/posts/WritePost'
import { ChildContext } from '../store/child'
import { IdentityContext } from '../store/identity'

const Posts = () => {

  const { getPosts, posts } = useContext(ChildContext)
  const { childActor } = useContext(IdentityContext)

  useEffect(()=>{
    if (childActor)
      getPosts()
  },[getPosts, childActor])

  return (
    <Box>
      <PostsContainer posts={posts} />
    </Box>
  )
}
export default Posts
