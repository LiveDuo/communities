import { useEffect, useContext } from 'react'
import { Box } from '@chakra-ui/react'

import PostContainer from '../components/containers/post'

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
      <PostContainer principalId={null} />
    </Box>
  )
}
export default Posts
