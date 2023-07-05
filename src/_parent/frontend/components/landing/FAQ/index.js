import { Accordion, AccordionItem, AccordionButton, AccordionPanel, Flex, useColorModeValue, Text, Container} from '@chakra-ui/react'
import { ChevronDownIcon } from '@chakra-ui/icons'

const FAQ = () =>  {
  return (
    <Flex minH={'50vh'} align={'center'} justify={'center'} bg={useColorModeValue('gray.50', 'gray.800')}>
      <Container>
        <Accordion allowMultiple width="100%" maxW="lg" bg="white" rounded="lg">
          <AccordionItem>
            <AccordionButton display="flex" alignItems="center" justifyContent="space-between" p={4} _hover={{ bg: 'gray.100' }}>
              <Text fontSize="md">What does community ownership means?</Text>
              <ChevronDownIcon fontSize="24px" />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <Text>
                New communities are owned and controlled <b>from your Internet Computer wallet</b>.
                <br/>
                <br/>
                If you owned a community you have special privilege to <b>assign moderators</b>, take the <b>community 
                offline</b> or <b>transfer the ownership</b> to another person if you wish to.
              </Text>
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem>
            <AccordionButton display="flex" alignItems="center" justifyContent="space-between" p={4} _hover={{ bg: 'gray.100' }}>
              <Text fontSize="md">Where are communities hosted if no servers are involved?</Text>
              <ChevronDownIcon fontSize="24px" />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <Text>
                All communities run on the Internet Computer. They are assigned <b>a subnet of 13 nodes</b> that takes care of hosting the service.
                <br/>
                <br/>
                That means that when a user create a post, sends a reply or uploads a picture that's handled from many geographically distributed servers 
                that <b>should come in consensus</b> over the result of that operation. 
                <br/>
                <br/>
                That also means that there <b>isn't someone in the middle</b> to increase the server costs for the service besides Internet Computer onchain governance.
              </Text>
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem>
            <AccordionButton display="flex" alignItems="center" justifyContent="space-between" p={4} _hover={{ bg: 'gray.100' }}>
              <Text fontSize="md">How do I manage my community?</Text>
              <ChevronDownIcon fontSize="24px" />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <Text>
                <b>Coming soon!</b>
                <br/>
                <br/>
                The wallet that created a community is <b>assigned the "Admin"</b>. 
                <br/>
                <br/>
                They will be able to <b>hide replies</b> they deemed inappropriate, <b>lock posts</b> and <b>assign other moderators</b> to have these special privileges too.
              </Text>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Container>
    </Flex>
  )
}

export default FAQ