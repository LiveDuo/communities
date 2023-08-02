import { useContext, useEffect, useState, useCallback } from 'react'
import { IdentityContext } from '../../store/identity'
import { ManagementContext } from '../../store/management'
import { ChildContext } from '../../store/child'
import { Principal } from "@dfinity/principal";
import { CHILD_CANISTER_ID } from '../../store/child'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Button, Text, Box } from '@chakra-ui/react'

const UpgradeModal = () => {
	const [isController, setIsController] = useState()
	const [upgrades, setUpgrades] = useState()
	const {isUpgradeModalOpen, onUpgradeModalClose, principal} = useContext(IdentityContext)
	const { managementActor } = useContext(ManagementContext)
	const { childActor } = useContext(ChildContext)

	const checkForUpgrade = useCallback(async () => {
		const canisterId = Principal.fromText(CHILD_CANISTER_ID)
		try {
			// get canister controllers
			const res = await managementActor.canister_status({canister_id: canisterId })
			const _isController = res.settings.controllers.some((c)=> c.toString() === principal.toString())
			setIsController(_isController)
			if (!_isController) return

			// get next upgrade
			const NextUpgrades = await childActor.get_next_upgrades()
			if (!NextUpgrades.Ok) return
			setUpgrades(NextUpgrades.Ok)
		} catch (err) {
			console.log(err)
		}
	}, [managementActor, principal, childActor])


	const upgradeCanister = useCallback(async (version, track) => {
		await childActor.upgrade_canister(version, track)
		onUpgradeModalClose()
	}, [childActor, onUpgradeModalClose])
	
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
					{upgrades?.length  === 0 ? 
						<Text>The canister is up to date</Text> : 
						upgrades?.map((u, i) => (
							<Box key={i}>
								<Text>Upgrade to {u.version}</Text>
								<Button onClick={() => upgradeCanister(u.version, u.track)}>Upgrade</Button>
						</Box>
						))}
				</Box>}
				</ModalBody>
			</ModalContent>
		</Modal>
	)
}
export default UpgradeModal
