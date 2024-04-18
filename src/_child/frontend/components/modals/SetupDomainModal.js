import { useContext, useCallback, useState} from 'react'

import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter, Box } from '@chakra-ui/react'
import { TableContainer, Table, Thead, Tr, Th, Tbody, Td  } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { Flex, Button, Text, Image, Input, Heading } from '@chakra-ui/react'

import { IdentityContext } from '../../store/identity'
import { CHILD_CANISTER_ID } from '../../store/child'


const DnsRecords = ({domain}) => {
  return (
    <Flex flexDirection={"column"}>
      <TableContainer>
      <Table variant='simple'>
        <Thead>
          <Tr>
            <Th>Record Type</Th>
            <Th>Host</Th>
            <Th>Value</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>CNAME</Td>
            <Td>@</Td>
            <Td>{domain}.icp1.io</Td>
          </Tr>
          <Tr>
            <Td>TXT</Td>
            <Td>_canister-id</Td>
            <Td>{CHILD_CANISTER_ID}</Td>
          </Tr>
          <Tr>
            <Td>CNAME</Td>
            <Td>_acme-challenge</Td>
            <Td>_acme-challenge.{domain}.icp2.io</Td>
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  </Flex>
  )
}

const AllReadyDone = ({domain, setUserFlowStep, setDomain}) => {
  return (
    <Card>
      <CardBody minW={"450px"} display={"flex"} flexDirection={"row"} alignItems={'center'}>
        <Box>
          <Heading ml="4px" size={"md"}>{domain}</Heading>
          <Text>{CHILD_CANISTER_ID}</Text>
        </Box>
        <Button ml={'auto'} onClick={() => {setUserFlowStep("dns-records"); setDomain("")}}>DNS</Button>
      </CardBody>
    </Card>
  )
}

const SetupDomainModal = () =>  {
  const [userFlowStep, setUserFlowStep] = useState("enter-domain")
  const [domain, setDomain] = useState("")
  const {setupCustomDomainDisclosure } = useContext(IdentityContext)

  const getTitle = useCallback(() => {
    if (userFlowStep === "enter-domain") {
      return "Enter Domain Name"
    } else if (userFlowStep === "waiting-registration") {
      return "Waiting Registration"
    } else if (userFlowStep === "dns-records") {
      return "Configure DNS Records" 
    } else if (userFlowStep === "already-setup") {
      return "Custom domain"
    }
  }, [userFlowStep])

  return (
    <Modal isOpen={setupCustomDomainDisclosure.isOpen} onClose={setupCustomDomainDisclosure.onClose} isCentered>
      <ModalOverlay />
      <ModalContent minW={userFlowStep === "dns-records" ? "700px": "500px"}>
      <ModalHeader>{getTitle()}</ModalHeader>
      <ModalCloseButton />
        <ModalBody>
          <Flex>
          {userFlowStep === "enter-domain" && <Input placeholder='eg. example.com' size='md' onChange={(e) => setDomain(e.target.value)} />}
          {userFlowStep === "waiting-registration" && <Text>Waiting for registration</Text>}
          {userFlowStep === "dns-records" && <DnsRecords domain={domain}/>}
          {userFlowStep === "already-setup" && <AllReadyDone domain={domain} setDomain={setDomain} setUserFlowStep={setUserFlowStep}/>}
          </Flex>
        </ModalBody>
        <ModalFooter>
          {userFlowStep === "enter-domain" && <Button disabled={domain.length <= 0} onClick={() => setUserFlowStep("waiting-registration")} variant='solid'>Register</Button>}
          {userFlowStep === "waiting-registration" && <Button onClick={() => setUserFlowStep("dns-records")} variant='solid'>Next</Button>}
          {userFlowStep === "dns-records" && (
            <>
              <Button mr="auto" variant={"ghost"} onClick={() => {setUserFlowStep("enter-domain"); setDomain("")}}>Reset</Button>
              <Button onClick={() => {setupCustomDomainDisclosure.onClose(); setUserFlowStep("already-setup")}} variant='solid'>Done</Button>
            </>
          )}
          {userFlowStep === "already-setup" && (<Button mr="auto" variant={"ghost"} onClick={() => {setUserFlowStep("enter-domain"); setDomain("")}}>Reset</Button>)}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default SetupDomainModal
