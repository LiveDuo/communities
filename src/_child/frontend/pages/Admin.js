import { useEffect, useContext } from 'react'
import { Box } from '@chakra-ui/react'
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'

import PostsContainer from '../components/containers/posts'
// import WritePost from '../components/posts/WritePost'
import { ChildContext } from '../store/child'

const Admin = () => {

  const { getPosts, posts, childActor } = useContext(ChildContext)

  useEffect(()=>{
    if (childActor)
      getPosts()
  },[getPosts, childActor])

  return (
    <Tabs>
      <TabList>
        <Tab>Posts</Tab>
        <Tab>Replies</Tab>
      </TabList>

      <TabPanels>
        <TabPanel>
         <PostsContainer posts={posts} />
        </TabPanel>
        <TabPanel>
          <p>two!</p>
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
}
export default Admin
