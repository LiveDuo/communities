import { useEffect, useContext } from 'react'
import { Box, Button, useDisclosure } from '@chakra-ui/react'

import PostsContainer from '../components/containers/posts'
// import WritePost from '../components/posts/WritePost'

import { ChildContext } from '../store/child'
import { IdentityContext } from '../store/identity'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'

import PostModal from '../components/modals/PostModal'

const Home = () => {

  const {  account, principal, onWalletModalOpen, setSelectedNetwork} = useContext(IdentityContext)
  const { getPosts, posts, childActor, createPost } = useContext(ChildContext)

  const { isOpen: isPostOpen, onOpen: onPostOpen, onClose: onPostClose } = useDisclosure()

  const onCreatePost = () => {
    if (!(account && principal)) {
      setSelectedNetwork()
      onWalletModalOpen()
      return
    }
    onPostOpen()
  }

  useEffect(()=>{
    if (childActor)
      getPosts()
  },[getPosts, childActor])

  return (
    <Box>
      <Button mt="28px" leftIcon={<FontAwesomeIcon icon={faPenToSquare} />} mb="28px" w="200px" onClick={onCreatePost}>New Post</Button>
      <PostModal isOpen={isPostOpen} onClose={onPostClose} createPost={createPost}/>

      <PostsContainer posts={posts} />
    </Box>
  )
}
export default Home
