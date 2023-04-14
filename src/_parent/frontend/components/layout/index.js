import { Box } from '@chakra-ui/react'

import Header from '../header'
import Modal from '../modal'

const Layout = ({children}) => (
  <Box>
    <Header />
    <Modal/>
    <Box m="40px" mt="80px" textAlign="center">
      {children}
    </Box>
  </Box>
)
export default Layout
