import Navbar from './components/Navbar'
import ExplodedStage from './components/ExplodedStage'
import Figures from './components/Figures'
import Refuel from './components/Refuel'
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

export default function App() {
  const route = useRoute()

  return (
    <>
      <Navbar route={route} />
      <main>
        {route === 'support' && <SupportPage />}
        {route === 'contact' && <ContactPage />}
        {route === 'home' && (
          <>
            <ExplodedStage />
            <Figures />
            <Refuel />
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
    </>
  )
}
