import { useEffect, useContext } from 'react'
import { Box } from '@chakra-ui/react'

import PostContainer from '../components/containers/post'

import { ChildContext } from '../store/child'
import { IdentityContext } from '../store/identity'

const Posts = () => {

  const { getProfileByAuth } = useContext(ChildContext)

  const { account } = useContext(IdentityContext)

  useEffect(() => {
    if (account)
      getProfileByAuth(account)
  }, [getProfileByAuth, account])

  return (
    <Box>
      <PostContainer principalId={null} />
    </Box>
  )
}
export default Posts
