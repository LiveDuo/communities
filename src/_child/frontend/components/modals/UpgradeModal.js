import { useContext, useEffect, useState, useCallback } from 'react'

import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react'
import { Button, Text, Box, Tag, Flex, Heading, Spinner, useToast } from '@chakra-ui/react'

import { IdentityContext } from '../../store/identity'
import { ManagementContext } from '../../store/management'
import { ChildContext } from '../../store/child'
import { CHILD_CANISTER_ID } from '../../store/child'

import { Principal } from "@dfinity/principal"
import { isLocal } from '../../utils/url'

const UpgradeModal = () => {
	
	const toast = useToast()

	const [isController, setIsController] = useState(null)
	const [upgrades, setUpgrades] = useState(null)
	const [metadata, setMetadata] = useState(null)

	const {isUpgradeModalOpen, onUpgradeModalClose, principal} = useContext(IdentityContext)
	const { managementActor } = useContext(ManagementContext)
	const { childActor } = useContext(ChildContext)

	const checkForUpgrade = useCallback(async () => {
		const canisterId = Principal.fromText(CHILD_CANISTER_ID)
		try {
			// get canister controllers
			let _isController
			if (isLocal) {
				const res = await managementActor.canister_status({canister_id: canisterId })
				_isController = res.settings.controllers.some((c)=> c.toString() === principal.toString())
			} else {
				const response = await fetch(`https://ic-api.internetcomputer.org/api/v3/canisters/${CHILD_CANISTER_ID}`);
				const data = await response.json();
				_isController = data.controllers.some((c)=> c.toString() === principal.toString())
			}

			setIsController(_isController)
			if (!_isController) return

			// get next upgrade
			const NextUpgrades = await childActor.get_next_upgrades()
			if (NextUpgrades.Ok) {
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
			setMetadata({})
			toast({ description: metadata.Err, status: 'error' })
		}
	}, [childActor, toast])


	const upgradeCanister = useCallback(async (version, track) => {
		await childActor.upgrade_canister(version, track)
		onUpgradeModalClose()
	}, [childActor, onUpgradeModalClose])
	
	useEffect(() => {
		if (managementActor && isUpgradeModalOpen) {
			checkForUpgrade()
			getCurrentVersion()
		}
	},[managementActor, checkForUpgrade, getCurrentVersion, isUpgradeModalOpen])

	return (
		<Modal isOpen={isUpgradeModalOpen} onClose={onUpgradeModalClose} isCentered>
			<ModalOverlay />
			<ModalContent minW="520px">
				<ModalHeader>Admin Dashboard</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<Flex p="24px">
					{(isController === null || metadata === null) && <Spinner m="0 auto"/>}
					{isController === false && <Text>Only controllers can view/update community settings.</Text>}
					{isController === true && <Box>
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
					</Flex>
				</ModalBody>
			</ModalContent>
		</Modal>
	)
}
export default UpgradeModal
