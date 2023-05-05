import { useContext, useEffect, useState, useCallback } from 'react'
import { IdentityContext } from '../../store/identity'
import { Principal } from "@dfinity/principal";
import { CHILD_CANISTER_ID } from '../../agents/child'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Button, Text, Box } from '@chakra-ui/react'

const UpgradeModal = () => {
	const [isController, setIsController] = useState()
	const [upgrade, setUpgrade] = useState()
  	const {isUpgradeModalOpen, onUpgradeModalClose, managementActor, childActor, principal} = useContext(IdentityContext)

	const checkForUpgrade = useCallback(async () => {
		const canisterId = Principal.fromText(CHILD_CANISTER_ID)
		try {
			// get canister controllers
			const res = await managementActor.canister_status({canister_id: canisterId })
			const _isController = res.settings.controllers.some((c)=> c.toString() === principal.toString())
			setIsController(_isController)
			if (!_isController) return

			// get next upgrade
			const NextUpgrade = await childActor.get_next_upgrade()
			const [ _upgrade ] = NextUpgrade.Ok
			if (!_upgrade) return
			setUpgrade(_upgrade)
		} catch (err) {
			console.log(err)
		}
	}, [managementActor, principal, childActor])


	const upgradeCanister = useCallback(async () => {
		await childActor.upgrade_canister(upgrade.wasm_hash)
		onUpgradeModalClose()
	}, [childActor, upgrade, onUpgradeModalClose])
	
	useEffect(()=> {
		if (managementActor)
			checkForUpgrade()
	},[managementActor, checkForUpgrade])

	return (
		<Modal isOpen={isUpgradeModalOpen} onClose={onUpgradeModalClose} isCentered>
			<ModalOverlay />
			<ModalContent minW="480px">
				<ModalHeader>Admin Dashboard</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
          		{!isController ? 
					<Text>Only controllers can view/update community settings</Text> :
					<Box>
					{!upgrade ? 
						<Text>The canister is up to date</Text> : 
						<Box>
							<Text>Upgrade to {upgrade.version}</Text>
							<Button onClick={upgradeCanister}>Upgrade</Button>
						</Box>}
				</Box>}
				</ModalBody>
			</ModalContent>
		</Modal>
	)
}
export default UpgradeModal
