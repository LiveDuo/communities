import { Box } from '@chakra-ui/react'

import Header from '../header'
import WalletModal from '../modals/WalletModal'
import UpgradeModal from '../modals/UpgradeModal'

const Layout = ({children}) => (
  <Box>
    <Header />
    <Box m="40px" mt="120px" textAlign="center">
      {children}
    </Box>
    <WalletModal/>
    <UpgradeModal/>
  </Box>
)
export default Layout
