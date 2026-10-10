import { ChevronRight } from 'lucide-react'
import Reveal from './Reveal'
import FounderPortrait from './FounderPortrait'
import { mailto } from '../config'

const categories = ['/ AUTOMOTIVE INNOVATION', '/ ADVANCED ELECTRIC MOBILITY', '/ NEXT-GENERATION ENERGY']

export default function SectionOne() {
  return (
    <section
      id="about"
      className="flex min-h-screen flex-col justify-between px-5 pb-12 pt-24 supports-[height:100svh]:min-h-[100svh] sm:px-8 sm:pt-28 md:px-12 md:pb-16"
    >
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
        <ul className="space-y-1.5">
          {categories.map((item, i) => (
            <Reveal
              as="li"
              key={item}
              delay={150 + i * 120}
              className="font-mono text-xs uppercase tracking-[0.15em] text-white/90 drop-shadow-md"
            >
              {item}
            </Reveal>
          ))}
        </ul>

        <Reveal delay={300} className="max-w-xs sm:text-right">
          <p className="text-lg leading-relaxed text-white drop-shadow-md sm:text-xl">
            We are reimagining electric mobility through innovative onboard energy generation, advanced
            engineering and a new vision of automotive freedom.
          </p>
        </Reveal>
      </div>

      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <Reveal delay={150}>
            <span className="mb-5 inline-block border-l-2 border-white bg-white/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] backdrop-blur-md">
              THE FUTURE OF ELECTRIC MOBILITY
            </span>
          </Reveal>
          <Reveal delay={280}>
            <h1 className="text-5xl font-normal leading-[1.05] tracking-tight text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
              Energy.
              <br />
              Reimagined.
            </h1>
          </Reveal>
        </div>

        <Reveal delay={420} className="self-start md:self-auto">
          <div className="flex items-center gap-4 rounded-xl bg-white/15 p-3 backdrop-blur-md">
            <FounderPortrait />
            <div className="pr-2">
              <p className="text-sm font-medium text-white">Meet the Founder</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/70">
                MATTEO CARMINATI — FOUNDER, VEYLAR
              </p>
              <a
                href={mailto('Hello Matteo — VEYLAR')}
                className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition-colors duration-300 hover:bg-white/85"
              >
                Get in Touch
                <ChevronRight size={14} />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
