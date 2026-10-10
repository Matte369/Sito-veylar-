import { useEffect } from 'react'
import Navbar from './components/Navbar'
import ExplodedStage from './components/ExplodedStage'
import DesignGallery from './components/DesignGallery'
import Figures from './components/Figures'
import EnergyChain from './components/EnergyChain'
import Journey from './components/Journey'
import Savings from './components/Savings'
import Mission from './components/Mission'
import Roadmap from './components/Roadmap'
import Team from './components/Team'
import Faq from './components/Faq'
import SupportBand from './components/SupportBand'
import Footer from './components/Footer'
import SupportPage from './pages/SupportPage'
import ContactPage from './pages/ContactPage'
import { useRoute } from './lib/route'
import { startSmoothScroll } from './lib/motion'

export default function App() {
  const route = useRoute()
  useEffect(() => startSmoothScroll(), [])

  return (
    <div className="grain">
      <Navbar route={route} />
      <main>
        {route === 'support' && <SupportPage />}
        {route === 'contact' && <ContactPage />}
        {route === 'home' && (
          <>
            <ExplodedStage />
            <DesignGallery />
            <Figures />
            <EnergyChain />
            <Journey />
            <Savings />
            <Mission />
            <Roadmap />
            <Team />
            <Faq />
            <SupportBand />
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
