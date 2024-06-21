import { useContext, useEffect } from 'react'
import { Box} from '@chakra-ui/react'

import { ParentContext } from '../store/parent'
import { IdentityContext } from '../store/identity'

import OnBoarding from '../app/OnBoarding'
import UserCommunities from '../app/UserCommunities'
import Header from '../app/Header'
import NoWalletModal from '../app/NoWalletModal'
import IcWalletModal from '../app/IcWalletModal'

const App = () => {

	const { walletConnected } = useContext(IdentityContext)
	const { userCommunities, parentActor, getUserCommunities } = useContext(ParentContext)

	useEffect(() => {
		if (parentActor)
			getUserCommunities()
	}, [parentActor, getUserCommunities])

	return (
		<Box>
			<Header />
			<NoWalletModal/>
			<IcWalletModal/>
			<Box m="40px" mt="80px" textAlign="center">
				<Box m="0 auto" maxW="1120px" borderWidth="1px" borderRadius="lg" variant="soft-rounded">
					{(userCommunities?.length > 0 && walletConnected) ? <UserCommunities/> : <OnBoarding/> }
				</Box>
			</Box>
		</Box>
	)
}

export default App
