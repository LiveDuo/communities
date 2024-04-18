import { Box } from '@chakra-ui/react'

import Header from '../header'
import WalletModal from '../modals/WalletModal'
import IcWalletModal from '../modals/IcWalletModal'
import UpgradeModal from '../modals/UpgradeModal'
import SetupDomainModal from '../modals/SetupDomainModal'

const Layout = ({children}) => (
  <Box>
    <Header />
    <Box m="40px" mt="120px" textAlign="center">
      {children}
    </Box>
    <IcWalletModal/>
    <WalletModal/>
    <UpgradeModal/>
    <SetupDomainModal/>
  </Box>
)
export default Layout
