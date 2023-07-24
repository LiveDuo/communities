import { useContext } from 'react'
import { Box} from '@chakra-ui/react'

import { ParentContext } from '../store/parent'

import OnBoarding from '../app/OnBoarding'
import UserCommunities from '../app/UserCommunities'
import Header from '../app/Header'
import WalletModal from '../app/WalletModal'

const App = () => {

	const { userCommunities } = useContext(ParentContext)

	return (

	<Box>
    <Header />
    <WalletModal/>
    <Box m="40px" mt="80px" textAlign="center">
		<Box m="0 auto" maxW="1120px" borderWidth="1px" borderRadius="lg" variant="soft-rounded">
			{userCommunities?.length > 0 ? <UserCommunities/> : <OnBoarding/> }
		</Box>
    </Box>
  </Box>
	)
}

export default App
