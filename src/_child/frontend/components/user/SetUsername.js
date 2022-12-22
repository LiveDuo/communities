import { useContext, useState } from 'react'
import { Spinner, Input, Button, Box } from '@chakra-ui/react'

import { ChildContext } from '../../store/child'

const SetUsername = () => {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const { setProfile, setUsername } = useContext(ChildContext)

  const handleNameChange = (event) => {
    if (event.currentTarget.value.length > 25) return
    setName(event.currentTarget.value)
  }

  const handleSubmit = async () => {
    
    if (loading || name.length === 0) return
    
    try {
      setLoading(true)
      const profile = await setUsername(name)
      setProfile(profile)
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  return (
    <Box mb="20px">
      <Box>
        <Input w="200px" type="text" autoComplete="off" placeholder="Username"
          onChange={handleNameChange} value={name} disabled={loading}/>
        <Button ml="8px" type="submit" disabled={loading} onClick={handleSubmit}>
          {loading ? <Spinner /> : "Save"}
        </Button>
      </Box>
    </Box>
  )
}
export default SetUsername
