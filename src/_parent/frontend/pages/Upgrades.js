import { Box, Flex, Tag, Heading, Table, Thead, Tbody, Tr, Th, Td, TableCaption, TableContainer, Button, IconButton } from '@chakra-ui/react'
import { useContext, useEffect, useCallback, useState } from 'react'
import { ParentContext } from '../store/parent'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { useNavigate, useLocation } from 'react-router-dom'

const timestampOptions = { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }
const NAVIGATE_BACK = -1
const Upgrades = () => {
    const { getUpgrades, parentActor } = useContext(ParentContext)
    const [tracks, setTracks] = useState()

    const navigate = useNavigate()
    const location = useLocation()

    const getUpgradesGrouped = useCallback(async () => {
        const upgrades = await getUpgrades()
        const groupByTrack = upgrades.reduce(
            (tracksGrouped, upgradeCurrent) => {
                
                const upgradeFrom = upgradeCurrent.upgrade_from
                const upgrade = {
                    version: upgradeCurrent.version,
                    description: upgradeCurrent.description,
                    timestamp: new Date(Number(upgradeCurrent.timestamp / 1000n / 1000n)),
                    upgradeFrom: upgradeFrom.length === 0 ? '-' : `${upgradeFrom[0].version}:${upgradeFrom[0].track}`
                }

                if (!tracksGrouped.hasOwnProperty(upgradeCurrent.track.name)) { // new track
                    const track = {
                        name: upgradeCurrent.track.name,
                        upgrades: [upgrade],
                        timestamp: new Date(Number(upgradeCurrent.track.timestamp / 1000n / 1000n))
                    }
                    tracksGrouped[upgradeCurrent.track.name] = track
                } else { // existing track
                    tracksGrouped[upgradeCurrent.track.name].upgrades.push(upgrade)
                }
                return tracksGrouped
            },
            {},
        )

        const _tracks = Object.values(groupByTrack)
        setTracks(_tracks)
    }, [getUpgrades])

    useEffect(() => {
        if (parentActor)
            getUpgradesGrouped()
    }, [parentActor, getUpgrades, getUpgradesGrouped])

    return (
        <>
            <Flex m="20px">
                {location.key !== "default" && <IconButton size="md" icon={<FontAwesomeIcon icon={faArrowLeft}/>} onClick={() => navigate(NAVIGATE_BACK)}/>}
                <Button display={{ base: 'none', md: 'inline-flex' }} fontSize={'sm'} fontWeight={600} color={'white'} bg={'green.400'} _hover={{bg: 'green.300'}} onClick={() => navigate('/app')} ml="auto">Dashboard</Button>
            </Flex>
            <Box mt="60px">
                {tracks?.length >= 0 &&
                    tracks.map((track, i) => <Box key={i} m="20px">
                        <Heading mb="20px">{track.name} track</Heading>
                        <TableContainer>
                            <Table variant='simple'>
                                <Thead>
                                    <Tr>
                                        <Th>Version</Th>
                                        <Th>Description</Th>
                                        <Th>Upgrade from</Th>
                                        <Th>Timestamp</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {track.upgrades.map((upgrade, i) =>
                                        <Tr key={i}>
                                            <Td><Tag>{upgrade.version}</Tag></Td>
                                            <Td>{upgrade.description}</Td>
                                            <Td><Tag>{upgrade.upgradeFrom}</Tag></Td>
                                            <Td>{upgrade.timestamp.toLocaleTimeString([], timestampOptions)}</Td>
                                        </Tr>)}
                                </Tbody>
                                <TableCaption>This track was created on {track.timestamp.toLocaleTimeString([], timestampOptions)}.</TableCaption>
                            </Table>
                        </TableContainer>
                    </Box>)}
            </Box>
        </>
        
    )
}

export default Upgrades
