import { useEffect, useContext } from 'react'
import { Box } from '@chakra-ui/react'

import PostsContainer from '../components/posts'
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
      {/* <Box mb="40px">
        <WritePost />
      </Box> */}

      <PostsContainer principalId={null} />
    </Box>
  )
}
export default Posts