import { useEffect, useContext } from 'react'
import { useParams } from 'react-router-dom'
import { Box } from '@chakra-ui/react'

import PostsContainer from '../components/posts'
import UserInfo from '../components/user/UserInfo'

import { ChildContext } from '../store/child'
import { IdentityContext } from '../store/identity'

const Posts = () => {
  const { address } = useParams()

  const { profile, getProfileByAddress } = useContext(ChildContext)
  const { principal } = useContext(IdentityContext)

  useEffect(() => {
    if (address) {
      getProfileByAddress(address)
    }
  }, [getProfileByAddress, address])

  return (
    <Box>

      <Box mb="40px">
        {profile && <UserInfo />}

        {/* {(isOwner && profile?.name.length > 0) && <WritePost />} */}
      </Box>

      <PostsContainer principalId={principal?.toString()} />

    </Box>
  )
}
export default Posts
