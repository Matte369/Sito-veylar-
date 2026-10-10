import Navbar from './components/Navbar'
import ExplodedStage from './components/ExplodedStage'
import Roadmap from './components/Roadmap'
import Founder from './components/Founder'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <ExplodedStage />
        <Roadmap />
        <Founder />
      </main>
      <Footer />
    </>
  )
}
