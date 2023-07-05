import { Box } from '@chakra-ui/react'

import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import HowItWork from '../components/landing/HowItWork'
import Features from '../components/landing/Features'
import CTA from '../components/landing/CTA'


const Landing = () => {
  return( 
    <Box>
      <Navbar/>
      <Hero/>
      <HowItWork/>
      <Features/>
      <CTA/>
    </Box>
  )
}

export default Landing