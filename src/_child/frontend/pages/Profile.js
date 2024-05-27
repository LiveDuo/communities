import { useEffect, useContext, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Text, Badge, Link } from '@chakra-ui/react'
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'

import { capitalizeFirstLetter, getSeedFromAccount, getExplorerUrl, getAuthentication } from '../utils/address'
import PostsContainer from '../components/containers/postsList'
import RepliesContainer from '../components/containers/repliesList'
import { IdentityContext } from '../store/identity'
import { ChildContext } from '../store/child'

import Jazzicon from 'react-jazzicon'

const Profile = () => {
  const { address, type } = useParams()
  
  const { account } = useContext(IdentityContext)
  const { profileUser, getProfileByAuth, getMostRecentPosts, childActor,  getMostLikedPosts, getMostLikedReplies } = useContext(ChildContext)
  
  const [mostLikedPosts, setMostLikedPosts] = useState() 
  const [mostLikedReplies, setMostLikedReplies] = useState() 
  const [mostRecentPosts, setMostRecentPosts] = useState() 

  const loadMostLikedPosts = useCallback(async () => {
    const mostLikedPosts = await getMostLikedPosts(address, capitalizeFirstLetter(type))
    setMostLikedPosts(mostLikedPosts)
  },[getMostLikedPosts, address, type])
  
  const loadMostLikedReplies = useCallback(async () => {
    const replies = await getMostLikedReplies(address, capitalizeFirstLetter(type))
    setMostLikedReplies(replies)
  },[getMostLikedReplies, address, type])
  
  const loadMostRecentPosts = useCallback(async () => {
    const posts = await getMostRecentPosts(address, capitalizeFirstLetter(type))
    setMostRecentPosts(posts)
  },[getMostRecentPosts, address, type])

  useEffect(() => {
    if (address) {
      getProfileByAuth(address, capitalizeFirstLetter(type))
    }
  }, [getProfileByAuth, address, type])

  useEffect(() => {
    if (childActor) {
      loadMostRecentPosts()
      loadMostLikedPosts()
      loadMostLikedReplies()
    }
  },[childActor, loadMostRecentPosts, address, type, loadMostLikedPosts, loadMostLikedReplies])
  
  return (
    <Box>
      
      <Box mb="20px">
        <Box mb="20px">
          <Jazzicon diameter={60} seed={account ? getSeedFromAccount({type: capitalizeFirstLetter(type), address: address}) : ''} />
        </Box>
        <Box mb="20px">
          <Box mr="8px" display="inline">
            <Badge fontSize={'md'}>{type?.toUpperCase()}</Badge>
          </Box>
          {type && address && <Link href={getExplorerUrl(getAuthentication(address, capitalizeFirstLetter(type)))} isExternal>
          
            <Text display="inline" mb="20px">{address} <FontAwesomeIcon icon={faArrowUpRightFromSquare}/></Text>
          </Link>}
        </Box>
        <Box mb="40px">
          <Box display="inline">
            <Badge mr="8px" fontSize={'xs'}>Last login: {profileUser ? profileUser.lastLogin.toLocaleDateString("en-GB") : ""}</Badge>
            <Badge mr="8px" fontSize={'xs'}>Join date: {profileUser ? profileUser.joinDate.toLocaleDateString("en-GB") : ""}</Badge>
            <Badge mr="8px" fontSize={'xs'}>Total posts: {profileUser ? profileUser.total_posts.toString() : ""}</Badge>
            <Badge mr="8px" fontSize={'xs'}>Total replies: {profileUser ? profileUser.total_replies.toString() : ""}</Badge>
            <Badge fontSize={'xs'}>Total likes: {profileUser ? profileUser.total_likes.toString() : ""}</Badge>
          </Box>
        </Box>
      </Box>

      <Tabs>
        <TabList>
          <Tab>Recent posts</Tab>
          <Tab>Top posts</Tab>
          <Tab>Top replies</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <PostsContainer posts={mostRecentPosts} />
          </TabPanel>
          <TabPanel>
          <Box>
            <PostsContainer posts={mostLikedPosts} />
          </Box>
          </TabPanel>
          <TabPanel>
          <Box>
            <RepliesContainer replies={mostLikedReplies} />
          </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  )
}
export default Profile
