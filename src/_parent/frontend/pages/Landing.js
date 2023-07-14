import { Box } from '@chakra-ui/react'

import Navbar from '../landing/Navbar'
import Hero from '../landing/Hero'
import HowItWorks from '../landing/HowItWorks'
import Features from '../landing/Features'
import CTA from '../landing/CTA'
import FAQ from '../landing/FAQ'
import Footer from '../landing/Footer'

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