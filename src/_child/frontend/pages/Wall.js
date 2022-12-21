import { useEffect, useContext } from 'react'
import { Box } from '@chakra-ui/react'

import WallPosts from '../components/posts'
import WritePost from '../components/posts/WritePost'

import { ProfileContext } from '../store/profile'
import { IdentityContext } from '../store/identity'

const Wall = () => {

  const { getProfileByAddress } = useContext(ProfileContext)

  const { account } = useContext(IdentityContext)

  useEffect(() => {
    if (account)
      getProfileByAddress(account)
  }, [getProfileByAddress, account])

  return (
    <Box>
      <Box mb="40px">
        <WritePost />
      </Box>

      <WallPosts principalId={null} />
    </Box>
  )
}
export default Wall
