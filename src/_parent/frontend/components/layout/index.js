import { Box } from '@chakra-ui/react'

// import Header from '../header'

const Layout = ({children}) => (
  <Box>
    {/* <Header /> */}
    <Box m="40px" mt="120px" textAlign="center">
      {children}
    </Box>
  </Box>
)
export default Layout
