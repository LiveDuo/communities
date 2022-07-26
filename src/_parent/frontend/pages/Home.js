import { useContext } from 'react'
import { Box, Button, Link } from '@chakra-ui/react'
import { ParentContext } from '../store/parent'

import { ExternalLinkIcon } from '@chakra-ui/icons'

const getPrincipalUrl = (childPrincipal) => {
  if (process.env.REACT_APP_ICP_ENV !== 'production')
    return `http://localhost:8000/?canisterId=${childPrincipal}`
  else 
    return `https://${childPrincipal}.ic0.app/`
}

const Home = () => {
  const {createChild, childPrincipal, loading} = useContext(ParentContext)
  return (
    <Box>
      <Button isLoading={loading} loadingText='Creating...' mb="20px" onClick={createChild}>Create Child</Button>
      <Box>{childPrincipal &&
        <Link href={getPrincipalUrl(childPrincipal)} isExternal>
          {childPrincipal} <ExternalLinkIcon mx='2px' />
        </Link>}
      </Box>
    </Box>
  )
}
export default Home
