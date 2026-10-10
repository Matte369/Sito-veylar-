import { useRef } from 'react'
import Reveal from './Reveal'
import { useLang } from '../i18n'
import { reducedMotion, useScrollFrames } from '../lib/motion'

/**
 * The one full-bleed dark block on the page. The statement lights up word by word
 * as you scroll through it, so it is read at the pace it was written.
 */
export default function Mission() {
  const { t } = useLang()
  const wordsRef = useRef<HTMLSpanElement[]>([])
  const before = t.mission.before.trim().split(' ')
  const words = [...before.map((w) => ({ w, accent: false })), { w: t.mission.highlight + t.mission.after, accent: true }]

  const ref = useScrollFrames<HTMLElement>((p) => {
    const n = wordsRef.current.length
    const reduce = reducedMotion()
    wordsRef.current.forEach((el, i) => {
      if (!el) return
      const start = 0.18 + (i / n) * 0.42
      const a = reduce ? 1 : Math.min(1, Math.max(0, (p - start) / 0.06))
      el.style.opacity = String(0.14 + 0.86 * a)
    })
  }, 'through')

  return (
    <section id="mission" ref={ref} className="scroll-mt-16 bg-ink text-paper">
      <div className="mx-auto flex min-h-[110dvh] max-w-[1440px] flex-col justify-center px-5 py-32 sm:px-8 md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/55">{t.mission.eyebrow}</p>
        <h2
          className="mt-8 max-w-5xl font-wide text-4xl font-medium leading-[1.06] tracking-[-0.02em] sm:text-6xl lg:text-7xl"
          aria-label={t.mission.before + t.mission.highlight + t.mission.after}
        >
          {words.map(({ w, accent }, i) => (
            <span
              key={`${w}-${i}`}
              aria-hidden="true"
              ref={(el) => {
                if (el) wordsRef.current[i] = el
              }}
              className={`motion-safe:transition-opacity motion-safe:duration-200 ${accent ? 'text-accent' : ''}`}
              style={{ opacity: 0.14 }}
            >
              {w}
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </h2>

        <div className="mt-24 grid gap-10 border-t border-paper/15 pt-10 md:grid-cols-3 md:gap-12">
          {t.mission.pillars.map((p, i) => (
            <Reveal key={p.title} delay={i * 140}>
              <h3 className="font-wide text-xl font-medium">{p.title}</h3>
              <p className="mt-3 max-w-[22rem] leading-relaxed text-paper/70">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
