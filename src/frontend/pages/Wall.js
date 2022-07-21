import { useEffect, useContext } from 'react'
import { Box } from '@chakra-ui/react'

import WallPosts from '../components/posts'
import SetUsername from '../components/user/SetUsername'
import WritePost from '../components/posts/WritePost'

import { ProfileContext } from '../store/profile'
import { IdentityContext } from '../store/identity'

const Wall = () => {

  const { profile, getProfileByPrincipal } = useContext(ProfileContext)

  const { principal } = useContext(IdentityContext)

  useEffect(() => {
    if (principal)
      getProfileByPrincipal(principal)
  }, [getProfileByPrincipal, principal])

  return (
    <Box>
      <Box mb="40px">
        {(profile?.name.length === 0) && <SetUsername />}
        {(profile?.name.length > 0) && <WritePost />}
      </Box>

      <WallPosts principalId={null} />
    </Box>
  )
}
export default Wall
