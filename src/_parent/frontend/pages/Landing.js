import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import HowItWork from '../components/landing/HowItWork'
import { Box } from '@chakra-ui/react'


const Landing = () => {
  return( 
    <Box>
      <Navbar/>
      <Hero/>
      <HowItWork/>
    </Box>
  )
}

export default Landing