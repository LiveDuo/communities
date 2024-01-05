import {
    Box,
    Tag,
    Heading,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableCaption,
    TableContainer,
} from '@chakra-ui/react'
import { useContext, useEffect, useCallback, useState } from 'react'
import { ParentContext } from '../store/parent'

const timestampOptions = { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }

const Upgrades = () => {
    const { getUpgrades, parentActor } = useContext(ParentContext)
    const [tracks, setTracks] = useState()
    
    const getUpgradesGrouped = useCallback(async () => {
        const upgrades = await getUpgrades()
        const groupByTrack = upgrades.reduce(
            (tracksGrouped, upgradeCurrent) => {
                
                const formatUpgradeFrom = upgradeCurrent.upgrade_from.length === 0 ? '-' : `${upgradeCurrent.upgrade_from[0].version}:${upgradeCurrent.upgrade_from[0].track}`
                const upgrade = {
                    version: upgradeCurrent.version,
                    description: upgradeCurrent.description,
                    timestamp: new Date(Number(upgradeCurrent.timestamp / 1000n / 1000n)),
                    upgradeFrom: formatUpgradeFrom
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
    }, [parentActor, getUpgrades])

    return (
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
    )
}

export default Upgrades