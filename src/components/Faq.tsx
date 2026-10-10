import { useState } from 'react'
import { Plus } from 'lucide-react'
import Reveal from './Reveal'
import RevealText from './RevealText'
import { useLang } from '../i18n'

export default function Faq() {
  const { t } = useLang()
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-16 mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12 md:py-40">
      <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <RevealText
            key={t.faq.title}
            text={t.faq.title}
            className="font-wide text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-ink sm:text-5xl lg:text-6xl"
          />
          <Reveal delay={200}>
            <p className="mt-6 max-w-[26rem] text-lg leading-relaxed text-graphite">
              {t.faq.more}{' '}
              <a href="#contact" className="text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-accent">
                {t.faq.write}
              </a>
              .
            </p>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <ul className="border-t border-ink/15">
            {t.faq.items.map((item, i) => {
              const isOpen = open === i
              const panel = `faq-panel-${i}`
              return (
                <li key={i} className="border-b border-ink/15">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panel}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                    >
                      <span className="text-lg font-medium text-ink transition-transform duration-300 group-hover:translate-x-1 sm:text-xl">
                        {item.q}
                      </span>
                      <Plus
                        size={20}
                        strokeWidth={1.25}
                        className={`shrink-0 text-ink motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'rotate-[135deg] text-accent' : ''}`}
                      />
                    </button>
                  </h3>
                  {/* Height animates through grid rows; the answer stays in the accessibility tree only when open. */}
                  <div
                    id={panel}
                    className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                    aria-hidden={!isOpen}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-6 pr-10 leading-relaxed text-graphite">{item.a}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
