import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import { Box } from '@chakra-ui/react'


const Landing = () => {
  return( 
    <Box>
      <Navbar/>
      <Hero/>
    </Box>
  )
}

export default Landing