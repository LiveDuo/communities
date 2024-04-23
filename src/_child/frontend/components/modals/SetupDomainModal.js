import { useContext, useCallback, useState, useEffect } from 'react'

import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, ModalFooter, Box } from '@chakra-ui/react'
import { TableContainer, Table, Thead, Tr, Th, Tbody, Td  } from '@chakra-ui/react'
import { Card, CardBody } from '@chakra-ui/react'
import { Flex, Button, Text, Input, Heading, Spinner, useToast } from '@chakra-ui/react'

import { IdentityContext } from '../../store/identity'
import { CHILD_CANISTER_ID, ChildContext } from '../../store/child'
import { isValidDomainName } from '../../utils/domain'

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
  const toast = useToast()
  const [userFlowStep, setUserFlowStep] = useState("checking-domain")
  const [domainName, setDomainName] = useState()
  const { setupCustomDomainDisclosure, principal } = useContext(IdentityContext)
  const { getDomain, childActor, registerDomain } = useContext(ChildContext)

  const checkForDomainName = useCallback(async () => {
		try {
			// get canister controllers
			const res = await childActor.canister_status()
			const _isController = res.settings.controllers.some((c)=> c.toString() === principal.toString())

			if (!_isController) return

			// get next upgrade
			const domain = await getDomain()
      setUserFlowStep(!domain[0] ? "enter-domain" : "already-setup")
      setDomainName(domain[0] && domain[0].domain_name)
		} catch (err) {
			console.log(err)
		}
	}, [principal, childActor, getDomain])

  useEffect(() => {
		if (childActor && setupCustomDomainDisclosure.isOpen) {
			checkForDomainName()
		}
	},[childActor, checkForDomainName, setupCustomDomainDisclosure.isOpen])

  const getTitle = useCallback(() => {
    if (userFlowStep === "checking-domain") {
      return "Checking For Domain"
    } else if (userFlowStep === "enter-domain") {
      return "Enter Domain Name"
    } else if (userFlowStep === "waiting-registration") {
      return "Waiting Registration"
    } else if (userFlowStep === "dns-records") {
      return "Configure DNS Records" 
    } else if (userFlowStep === "already-setup") {
      return "Custom domain"
    }
  }, [userFlowStep])

  const register = useCallback(async () => {
    if(!isValidDomainName(domainName)) {
      toast({ description: "Invalid Domain Name", status: 'error' })
      return
    }
    
    setUserFlowStep("waiting-registration")
    await registerDomain(domainName)
    setUserFlowStep("dns-records")
  }, [registerDomain, domainName, setUserFlowStep, toast])

  return (
    <Modal isOpen={setupCustomDomainDisclosure.isOpen} onClose={() => {setupCustomDomainDisclosure.onClose(); setUserFlowStep("checking-domain")}} isCentered>
      <ModalOverlay />
      <ModalContent minW={userFlowStep === "dns-records" ? "700px": "500px"}>
      <ModalHeader>{getTitle()}</ModalHeader>
      <ModalCloseButton />
        <ModalBody>
          <Flex>
            {userFlowStep === "checking-domain" && <Spinner m="0 auto"/>}
            {userFlowStep === "enter-domain" && <Input placeholder='eg. example.com' size='md' onChange={(e) => setDomainName(e.target.value)} />}
            {userFlowStep === "waiting-registration" && <Text>Waiting for registration</Text>}
            {userFlowStep === "dns-records" && <DnsRecords domain={domainName}/>}
            {userFlowStep === "already-setup" && <AllReadyDone domain={domainName} setDomain={setDomainName} setUserFlowStep={setUserFlowStep}/>}
          </Flex>
        </ModalBody>
        <ModalFooter>
          {userFlowStep === "enter-domain" && <Button isDisabled={!domainName || domainName.length < 0} onClick={register} variant='solid'>Register</Button>}
          {userFlowStep === "dns-records" && (
            <>
              <Button mr="auto" variant={"ghost"} onClick={() => {setUserFlowStep("enter-domain"); setDomainName("")}}>Reset</Button>
              <Button onClick={() => {setupCustomDomainDisclosure.onClose(); setUserFlowStep("checking-domain")}} variant='solid'>Done</Button>
            </>
          )}
          {userFlowStep === "already-setup" && (<Button mr="auto" variant={"ghost"} onClick={() => {setUserFlowStep("enter-domain"); setDomainName("")}}>Reset</Button>)}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default SetupDomainModal
