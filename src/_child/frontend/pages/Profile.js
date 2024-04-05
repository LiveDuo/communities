import { useEffect, useContext, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Text, Badge, Link } from '@chakra-ui/react'
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'

import { capitalizeFirstLetter, getSeedFromAccount, getExplorerUrl, getAuthentication } from '../utils/address'
import EntriesContainer from '../components/containers/entries'
import { IdentityContext } from '../store/identity'
import { ChildContext } from '../store/child'
// import { timeSince } from '../utils/time'

import Jazzicon from 'react-jazzicon'

const Profile = () => {
  const { address, type } = useParams()
  
  const { account } = useContext(IdentityContext)
  const { getProfileByAuth, getPostsByAuth, postsUser, childActor,  getMostLikedPosts, getMostLikedReplies } = useContext(ChildContext)
  
  const [mostLikedPosts, setMostLikedPosts] = useState() 
  const [mostLikedReplies, setMostLikedReplies] = useState() 

  const loadMostLikedPosts = useCallback(async () => {
    const mostLikedPosts = await getMostLikedPosts(address, capitalizeFirstLetter(type))
    setMostLikedPosts(mostLikedPosts)
  },[getMostLikedPosts, address, type])
  
  const loadMostLikedReplies = useCallback(async () => {
    const replies = await getMostLikedReplies(address, capitalizeFirstLetter(type))
    setMostLikedReplies(replies)
  },[getMostLikedReplies, address, type])

  useEffect(() => {
    if (address) {
      getProfileByAuth(address, capitalizeFirstLetter(type))
    }
  }, [getProfileByAuth, address, type])

  useEffect(() => {
    if (childActor) {
      getPostsByAuth(address, capitalizeFirstLetter(type))
      loadMostLikedPosts()
      loadMostLikedReplies()
    }
  },[childActor, getPostsByAuth, address, type, loadMostLikedPosts, loadMostLikedReplies])

  return (
    <Box>
      
      <Box mb="20px">
        <Box mb="20px">
          <Jazzicon diameter={60} seed={account ? getSeedFromAccount(account) : ''} />
        </Box>
        <Box mb="20px">
          <Box mr="8px" display="inline">
            <Badge fontSize={'md'}>{type?.toUpperCase()}</Badge>
          </Box>
          {type && address && <Link href={getExplorerUrl(getAuthentication(address, capitalizeFirstLetter(type)))} isExternal>
            <Text display="inline" mb="20px">{address}</Text>
          </Link>}
        </Box>
        <Box mb="20px">
          <Box display="inline">
            <Badge mr="8px" fontSize={'xs'}>Last login: 2/2/22</Badge>
            <Badge mr="8px" fontSize={'xs'}>Join date: 3/3/23</Badge>
            <Badge mr="8px" fontSize={'xs'}>Total posts: 13</Badge>
            <Badge mr="8px" fontSize={'xs'}>Total replies: 4</Badge>
            <Badge fontSize={'xs'}>Total likes: 23</Badge>
          </Box>
        </Box>
      </Box>

      <Tabs>
        <TabList>
          <Tab>Recent posts</Tab>
          <Tab>Top tops</Tab>
          <Tab>Top replies</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <EntriesContainer entries={postsUser} />
          </TabPanel>
          <TabPanel>
          <Box>
            <EntriesContainer entries={mostLikedPosts} />
            {/* {mostLikedPosts && mostLikedPosts.map((p, i)=> (
              <Box key={i}>
                <Text>{p.title}</Text>
                <Text>{p.description}</Text>
                <Text>{timeSince(p.timestamp)}</Text>
              </Box>
            ))} */}
          </Box>
          </TabPanel>
          <TabPanel>
          <Box>
            <EntriesContainer entries={mostLikedReplies} />
            {/* {mostLikedReplies && mostLikedReplies.map((p, i)=> (
              <Box key={i}>
                <Text>{p.text}</Text>
                <Text>{timeSince(p.timestamp)}</Text>
              </Box>
            ))} */}
          </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}
export default Profile
