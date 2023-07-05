import { Box } from '@chakra-ui/react'

import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import HowItWork from '../components/landing/HowItWork'
import Features from '../components/landing/Features'


const Landing = () => {
  return( 
    <Box>
      <Navbar/>
      <Hero/>
      <HowItWork/>
      <Features/>
    </Box>
  )
}

export default Landing