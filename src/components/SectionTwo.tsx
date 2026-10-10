import { ChevronRight } from 'lucide-react'
import Reveal from './Reveal'
import { mailto } from '../config'

const capabilities = [
  {
    title: 'Onboard Energy Generation',
    body: 'Exploring advanced onboard energy conversion to support a new generation of electric vehicles.',
  },
  {
    title: 'Intelligent Power Management',
    body: 'Combining continuous energy generation, battery support and smart control for adaptive electric performance.',
  },
  {
    title: 'Freedom to Go Further',
    body: 'Developing an automotive platform focused on extended driving range and a more flexible energy experience.',
  },
]

function exploreTechnology() {
  const panel = document.getElementById('capabilities')
  if (!panel) return
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' })
  panel.focus({ preventScroll: true })
}

export default function SectionTwo() {
  return (
    <section
      id="technology"
      className="flex min-h-screen flex-col justify-between px-5 pb-12 pt-24 supports-[height:100svh]:min-h-[100svh] sm:px-8 sm:pt-28 md:px-12 md:pb-16"
    >
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
        <Reveal delay={120}>
          <span className="inline-block border-l-2 border-white bg-white/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] backdrop-blur-md">
            ENGINEERED FOR TOMORROW
          </span>
        </Reveal>

        <Reveal delay={220} className="max-w-sm sm:text-right">
          <p className="text-lg leading-relaxed text-white drop-shadow-md sm:text-xl">
            Our vision goes beyond conventional electric mobility — exploring new ways to generate, manage and
            deliver energy directly onboard the vehicle.
          </p>
        </Reveal>
      </div>

      <div className="flex flex-1 flex-col justify-end gap-12 pt-12 md:flex-row md:items-end md:justify-between md:gap-16">
        <div className="max-w-xl">
          <Reveal delay={180}>
            <h2 className="text-5xl font-normal leading-[1.05] tracking-tight text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
              Driven by
              <br />
              innovation.
            </h2>
          </Reveal>
          <Reveal delay={320}>
            <p className="mt-6 max-w-md text-sm text-white/80 drop-shadow-md sm:text-base">
              VEYLAR is developing a new approach to electric mobility, combining advanced energy conversion,
              intelligent power management and automotive engineering. From concept and simulation to future
              real-world validation, every step brings our vision closer to the road.
            </p>
          </Reveal>
          <Reveal delay={420}>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={exploreTechnology}
                className="inline-flex items-center gap-1 rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition-colors duration-300 hover:bg-white/85 sm:text-sm"
              >
                Explore the Technology
                <ChevronRight size={14} />
              </button>
              <a
                href={mailto('Contact VEYLAR')}
                className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-xs backdrop-blur-md transition-colors duration-300 hover:bg-white/20 sm:text-sm"
              >
                Contact VEYLAR
              </a>
            </div>
          </Reveal>
        </div>

        <div
          id="capabilities"
          tabIndex={-1}
          aria-label="VEYLAR technology capabilities"
          className="w-full max-w-md rounded-2xl border border-white/15 bg-white/10 px-5 outline-none backdrop-blur-md sm:px-6"
        >
          {capabilities.map((item, i) => (
            <Reveal
              key={item.title}
              delay={300 + i * 110}
              className={`group flex gap-5 py-5 ${i < capabilities.length - 1 ? 'border-b border-white/15' : ''}`}
            >
              <span className="w-5 shrink-0 pt-1 font-mono text-[11px] tracking-[0.15em] text-white/55">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-base font-medium text-white sm:text-lg">{item.title}</h3>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-white/40 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-white"
                  />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
