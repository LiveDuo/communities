import { Box } from '@chakra-ui/react'

import Header from '../header'
import WalletModal from '../modals/WalletModal'

const Layout = ({children}) => (
  <Box>
    <Header />
    <Box m="40px" mt="120px" textAlign="center">
      {children}
    </Box>
    <WalletModal/>
  </Box>
)
export default Layout
