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
    // sort track by date
    const getData = useCallback(async () => {
        const upgrades = await getUpgrades()
        const initialValue = {};
        const groupByTrack = upgrades.reduce(
            (accumulator, currentValue) => {
                const { version, description, upgrade_from, timestamp } = currentValue
                const formatUpgradeFrom = upgrade_from.length === 0 ? '-' : `${upgrade_from[0].version}:${upgrade_from[0].track}`
                const upgrade = { version, description, timestamp: new Date(Number(timestamp / 1000n / 1000n)), upgradeFrom: formatUpgradeFrom }
                if (!accumulator.hasOwnProperty(currentValue.track.name)) {
                    accumulator[currentValue.track.name] = {
                        name: currentValue.track.name,
                        upgrades: [upgrade],
                        timestamp: new Date(Number(currentValue.track.timestamp / 1000n / 1000n))
                    }
                } else {
                    accumulator[currentValue.track.name].upgrades.push(upgrade)
                }
                return accumulator
            },
            initialValue,
        );
        const _tracks = Object.values(groupByTrack)
        setTracks(_tracks)
    }, [getUpgrades])

    useEffect(() => {
        if (parentActor)
            getData()
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