import { useContext, useEffect, useState, useCallback } from 'react'
import { IdentityContext } from '../../store/identity'
import { ManagementContext } from '../../store/management'
import { ChildContext } from '../../store/child'
import { Principal } from "@dfinity/principal";
import { CHILD_CANISTER_ID } from '../../store/child'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Button, Text, Box, Tag, Heading, useToast } from '@chakra-ui/react'

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
			<ModalContent minW="520px">
				<ModalHeader>Admin Dashboard</ModalHeader>
				<ModalCloseButton />
				<ModalBody p="24px">
          		{!isController ? 
					<Text>Only controllers can view/update community settings.</Text> :
					<Box>
						<Heading size="sm" mb="16px">Current info:</Heading>
						<Box mb="16px">
							<Text ml="4px" as="span">Track: <Tag>{metadata?.track ?? 'n/a'}</Tag></Text>
							<Text ml="4px" as="span">Version: <Tag>{metadata?.version ?? 'n/a'}</Tag></Text>
						</Box>
						<br/>
						<Heading size="sm" mb="16px">Available upgrades:</Heading>
						{upgrades?.length  > 0 ? 
							upgrades?.map((u, i) => (
								<Box key={i} borderWidth='1px' borderRadius='lg' p="20px" mb="8px">
									<Box mb="16px">
										<Text ml="4px" as="span">Track: <Tag>{u.track}</Tag></Text>
										<Text ml="4px" as="span">Version: <Tag>{u.version}</Tag></Text>
									</Box>
									<Text mb="16px">{u.description ?? 'No description'}</Text>
									<Button size="sm" onClick={() => upgradeCanister(u.version, u.track)}>Upgrade</Button>
								</Box>
							)) :
							<Text>No available upgrades</Text>}
					</Box>}
				</ModalBody>
			</ModalContent>
		</Modal>
	)
}
export default UpgradeModal
