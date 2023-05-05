import { useContext, useEffect, useState, useCallback } from 'react'
import { IdentityContext } from '../../store/identity'
import { Principal } from "@dfinity/principal";
import { CHILD_CANISTER_ID } from '../../agents/child'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Button, Text} from '@chakra-ui/react'

const UpgradeModal = () => {
	const [isController, setIsController] = useState()
	const [upgrade, setUpgrade] = useState()
  const {isUpgradeModalOpen, onUpgradeModalClose, managementActor, childActor, principal} = useContext(IdentityContext)

	const checkForUpgrade = useCallback(async () => {
		const canisterId = Principal.fromText(CHILD_CANISTER_ID)
		try {
			const res = await managementActor.canister_status({canister_id: canisterId })
			const controllers = res.settings.controllers
			const _isController = controllers.some((c)=> c.toString() === principal.toString())
			setIsController(_isController)
			if(!_isController)
				return
			const NextUpgrade = await childActor.get_next_upgrade()
			const [ _upgrade ] = NextUpgrade.Ok
			if(!_upgrade)
				return
			setUpgrade(_upgrade)
		} catch (err) {
			console.log(err)
		}
	},[managementActor, principal, childActor])


	const upgradeCanister = useCallback(async () => {
		await childActor.upgrade_canister(upgrade.wasm_hash)
		onUpgradeModalClose()
	},[childActor, upgrade, onUpgradeModalClose])
	
	useEffect(()=> {
		if(managementActor) {
			checkForUpgrade()
		}
	},[managementActor, checkForUpgrade])

	return (
		<Modal isOpen={isUpgradeModalOpen} onClose={onUpgradeModalClose} isCentered>
			<ModalOverlay />
			<ModalContent minW="480px">
				<ModalHeader>Available Upgrade</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
          {!isController && <Text>Sorry you are not an admin</Text>}
					{(isController && !upgrade) && <Text>Your community is update</Text>}
					{(isController && upgrade) && (
						<>
							<Text>You can upgrade to the {upgrade.version} version</Text>
							<Button onClick={upgradeCanister}>Upgrade</Button>
						</>
					)}
				</ModalBody>
			</ModalContent>
		</Modal>
	)
}
export default UpgradeModal