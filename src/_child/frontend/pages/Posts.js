import { useEffect, useContext } from 'react'
import { Box } from '@chakra-ui/react'

import PostsContainer from '../components/containers/posts'
// import WritePost from '../components/posts/WritePost'
import { ChildContext } from '../store/child'

const Posts = () => {

  const { getPosts, posts, childActor } = useContext(ChildContext)

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
