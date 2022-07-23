import { useEffect, useContext } from 'react'
import { useEthers } from '@usedapp/core'
import { useParams } from 'react-router-dom'
import { Box } from '@chakra-ui/react'

import WallPosts from '../components/posts'
import SetUsername from '../components/user/SetUsername'
import UserInfo from '../components/user/UserInfo'
import WritePost from '../components/posts/WritePost'

import { ProfileContext } from '../store/profile'
import { IdentityContext } from '../store/identity'

const Wall = () => {
  const { account } = useEthers()
  const { address } = useParams()

  const { profile, getProfileByPrincipal } = useContext(ProfileContext)
  const { principal } = useContext(IdentityContext)

  const isOwner = account?.toLowerCase() === address.toLowerCase()

  useEffect(() => {
    if (principal) {
      getProfileByPrincipal(principal)
    }
  }, [getProfileByPrincipal, principal])

  return (
    <Box>

      <Box mb="40px">
        {(isOwner && profile?.name.length === 0) && <SetUsername />}
        {profile && <UserInfo />}

        {(isOwner && profile?.name.length > 0) && <WritePost />}
      </Box>

      <WallPosts principalId={principal?.toString()} />

    </Box>
  )
}
export default Wall
