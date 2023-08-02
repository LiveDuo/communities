import { useContext, useEffect, useState, useCallback } from 'react'
import { IdentityContext } from '../../store/identity'
import { ManagementContext } from '../../store/management'
import { ChildContext } from '../../store/child'
import { Principal } from "@dfinity/principal";
import { CHILD_CANISTER_ID } from '../../store/child'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Button, Text, Box, useToast } from '@chakra-ui/react'

const UpgradeModal = () => {
	const [isController, setIsController] = useState()
	const [upgrades, setUpgrades] = useState([])
	const [metadata, setMetadata] = useState()
	const {isUpgradeModalOpen, onUpgradeModalClose, principal} = useContext(IdentityContext)
	const { managementActor } = useContext(ManagementContext)
	const { childActor } = useContext(ChildContext)

	const toast = useToast()

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
			if(NextUpgrades.Ok) {
				setUpgrades(NextUpgrades.Ok)
			} else {
				toast({ description: NextUpgrades.Err, status: 'error' })
			}
		} catch (err) {
			console.log(err)
		}
	}, [managementActor, principal, childActor, toast])

	const getCurrentVersion = useCallback(async ()=>{
		const metadata = await childActor.get_metadata()
		if(metadata.Ok) {
			setMetadata(metadata.Ok)
		} else {
			toast({ description: metadata.Err, status: 'error' })
		}
	},[childActor, toast])


	const upgradeCanister = useCallback(async (version, track) => {
		await childActor.upgrade_canister(version, track)
		onUpgradeModalClose()
	}, [childActor, onUpgradeModalClose])
	
	useEffect(()=> {
		if (managementActor) {
			checkForUpgrade()
			getCurrentVersion()
		}
	},[managementActor, checkForUpgrade, getCurrentVersion])

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
						<Text>The current version of the canister is {metadata ? metadata.version : "" }-{metadata ? metadata.track : ""} is up to date</Text> : 
						<>
							<Text>The current version is {metadata?.version}-{metadata?.track}</Text>
							<Text>You can upgrade to:</Text>
							{upgrades?.map((u, i) => (
								<Box key={i}>
									<Text>Upgrade to {u.version}-{u.track}</Text>
									<Text>{u.description}</Text>
									<Button onClick={() => upgradeCanister(u.version, u.track)}>Upgrade</Button>
								</Box>
							))}
						</>
					}
				</Box>}
				</ModalBody>
			</ModalContent>
		</Modal>
	)
}
export default UpgradeModal
