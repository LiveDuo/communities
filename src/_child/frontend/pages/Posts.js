import { useEffect, useContext } from 'react'
import { Box } from '@chakra-ui/react'

import PostsContainer from '../components/containers/posts'
// import WritePost from '../components/posts/WritePost'

import { ChildContext } from '../store/child'
import { IdentityContext } from '../store/identity'

const Posts = () => {

  const { getProfileByAddress } = useContext(ChildContext)

  const { account } = useContext(IdentityContext)

  useEffect(() => {
    if (account)
      getProfileByAddress(account)
  }, [getProfileByAddress, account])

  return (
    <Box>
      <PostsContainer principalId={null} />
    </Box>
  )
}
export default Posts
