import { useEffect, useContext } from 'react'
import { useEthers } from '@usedapp/core'
import { useParams } from 'react-router-dom'
import { Box } from '@chakra-ui/react'

import PostsContainer from '../components/posts'
import SetUsername from '../components/user/SetUsername'
import UserInfo from '../components/user/UserInfo'
// import WritePost from '../components/posts/WritePost'

import { ChildContext } from '../store/child'
import { IdentityContext } from '../store/identity'

const Posts = () => {
  const { account } = useEthers()
  const { address } = useParams()

  const { profile, getProfileByAddress } = useContext(ChildContext)
  const { principal } = useContext(IdentityContext)

  const isOwner = account?.toLowerCase() === address.toLowerCase()

  useEffect(() => {
    if (address) {
      getProfileByAddress(address)
    }
  }, [getProfileByAddress, address])

  return (
    <Box>

      <Box mb="40px">
        {(isOwner && profile?.name.length === 0) && <SetUsername />}
        {profile && <UserInfo />}

        {/* {(isOwner && profile?.name.length > 0) && <WritePost />} */}
      </Box>

      <PostsContainer principalId={principal?.toString()} />

    </Box>
  )
}
export default Posts