import { Box } from '@chakra-ui/react'

import Header from '../header'
import WalletModal from '../modals/WalletModal'
import IcWalletModal from '../modals/IcWalletModal'
import UpgradeModal from '../modals/UpgradeModal'

const Layout = ({children}) => (
  <Box>
    <Header />
    <Box m="40px" mt="120px" textAlign="center">
      {children}
    </Box>
    <IcWalletModal/>
    <WalletModal/>
    <UpgradeModal/>
  </Box>
)
export default Layout
