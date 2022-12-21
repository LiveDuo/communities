import { useContext, useState } from 'react'
import { Spinner, Input, Button, Box } from '@chakra-ui/react'

import { WallContext } from '../../store/wall'

const WritePost = () => {

  const [post, setPost] = useState('')

  const { loading, setLoading, writeData } = useContext(WallContext)
  
  const handlePostChange = (event) => {
    if (event.currentTarget.value.length > 255) return
    setPost(event.currentTarget.value)
  }

  const handleSubmit = async () => {

    if (loading || post.length === 0) return
    
    try {
      setLoading(true)
      await writeData(post)
    } catch (error) {
      console.error(error)
    }
    setPost('')
    setLoading(false)
  }

  return (
    <Box mb="20px">
      <Box>
        <Input w="200px" type="text" autoComplete="off" placeholder="Enter text" 
          disabled={loading} onChange={handlePostChange} value={post}/>
        <Button ml="8px" type="submit" disabled={loading} onClick={handleSubmit}>
          {loading ? <Spinner /> : "New Post"}
        </Button>
      </Box>
    </Box>
  )
}
export default WritePost
