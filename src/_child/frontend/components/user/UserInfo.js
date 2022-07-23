import { useContext } from 'react'
import { shortenAddress } from '@usedapp/core'
import { Box, Spinner } from '@chakra-ui/react'

import { ProfileContext } from '../../store/profile'
import { IdentityContext } from '../../store/identity'
import { useENSName } from '../../utils/hooks'

const UserInfo = () => {
  const { profile } = useContext(ProfileContext)
  const { principal } = useContext(IdentityContext)
  const { ENSName } = useENSName(profile?.address)

  if (!profile) return <Spinner/>
  return profile?.name && (
    <Box mb="20px">
      <Box><b>Name:</b> {profile.name}</Box>
      <Box><b>Ethereum:</b> {ENSName || shortenAddress(profile.address)}</Box>
      <Box><b>Internet Computer:</b> {principal.toString().substring(0, 8)}</Box>
    </Box>
  )
}
export default UserInfo
