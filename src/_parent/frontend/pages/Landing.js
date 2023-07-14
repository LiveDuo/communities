import { Box } from '@chakra-ui/react'

import Navbar from '../components/landing/Navbar'
import Hero from '../components/landing/Hero'
import HowItWorks from '../components/landing/HowItWorks'
import Features from '../components/landing/Features'
import CTA from '../components/landing/CTA'
import FAQ from '../components/landing/FAQ'
import Footer from '../components/landing/Footer'

const Landing = () => {
  return( 
    <Box>
      <Navbar/>
      <Hero/>
      <HowItWorks/>
      <Features/>
      <CTA/>
      <FAQ/>
      <Footer/>
    </Box>
  )
}

export default Landing