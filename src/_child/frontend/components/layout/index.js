import { Box } from '@chakra-ui/react'

import Header from '../header'
import WalletModal from '../modals/WalletModal'

const Layout = ({children}) => (
  <Box>
    <Header />
    <WalletModal/>
    <Box m="40px" mt="120px" textAlign="center">
      {children}
    </Box>
  </Box>
)
export default Layout
