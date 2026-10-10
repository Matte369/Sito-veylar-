import { useState } from 'react'
import { Plus } from 'lucide-react'
import Reveal from './Reveal'
import { FAQ } from '../content'

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-16 mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12 md:py-36">
      <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <Reveal>
          <h2 className="font-wide text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-ink sm:text-5xl lg:text-6xl">
            Frequently asked questions.
          </h2>
          <p className="mt-6 max-w-[26rem] text-lg leading-relaxed text-graphite">
            Something else on your mind?{' '}
            <a href="#contact" className="text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
              Write to us
            </a>
            .
          </p>
        </Reveal>

        <Reveal delay={120}>
          <ul className="border-t border-ink/15">
            {FAQ.map((item, i) => {
              const isOpen = open === i
              const panel = `faq-panel-${i}`
              return (
                <li key={item.q} className="border-b border-ink/15">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panel}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-6 py-6 text-left"
                    >
                      <span className="text-lg font-medium text-ink sm:text-xl">{item.q}</span>
                      <Plus
                        size={20}
                        strokeWidth={1.75}
                        className={`shrink-0 text-ink motion-safe:transition-transform motion-safe:duration-300 ${isOpen ? 'rotate-45' : ''}`}
                      />
                    </button>
                  </h3>
                  {isOpen && (
                    <p id={panel} className="pb-6 pr-10 leading-relaxed text-graphite">
                      {item.a}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
