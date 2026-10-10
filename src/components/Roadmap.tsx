import Reveal from './Reveal'
import RevealText from './RevealText'
import { useLang } from '../i18n'
import { useInView } from '../lib/motion'

const DONE = [true, true, false]

export default function Roadmap() {
  const { t } = useLang()
  const [lineRef, drawn] = useInView<HTMLOListElement>(0.4)
  return (
    <section id="roadmap" className="scroll-mt-16 mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12 md:py-40">
      <div className="max-w-3xl">
        <RevealText
          key={t.roadmap.title}
          text={t.roadmap.title}
          className="font-wide text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-ink sm:text-5xl lg:text-6xl"
        />
        <Reveal delay={200}>
          <p className="mt-6 max-w-[38rem] text-lg leading-relaxed text-graphite">{t.roadmap.body}</p>
        </Reveal>
      </div>

      <ol ref={lineRef} className="relative mt-20 grid gap-12 md:grid-cols-3 md:gap-10">
        {/* Progress line: solid through completed work, then a faint track for what comes next. It draws in on view. */}
        <span aria-hidden="true" className="absolute left-0 right-0 top-[7px] hidden h-px bg-ink/15 md:block" />
        <span
          aria-hidden="true"
          className={`absolute left-0 top-[7px] hidden h-px w-[calc(66.666%-1rem)] origin-left bg-ink motion-safe:transition-transform motion-safe:duration-[1600ms] motion-safe:ease-[cubic-bezier(0.65,0,0.35,1)] md:block ${
            drawn ? 'scale-x-100' : 'motion-safe:scale-x-0'
          }`}
        />
        {t.roadmap.steps.map((s, i) => (
          <Reveal as="li" key={s.name} delay={300 + i * 350} className="relative pl-8 md:pl-0">
            <span
              aria-hidden="true"
              className={`absolute left-0 top-0 block h-[15px] w-[15px] rounded-full border-2 md:relative ${
                DONE[i] ? 'border-ink bg-ink' : 'border-accent bg-paper motion-safe:animate-pulse'
              }`}
            />
            <h3 className="font-wide text-xl font-medium text-ink md:mt-8">{s.name}</h3>
            <p className="mt-2 max-w-[22rem] leading-relaxed text-graphite">{s.body}</p>
            {!DONE[i] && <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-accent">{t.roadmap.next}</p>}
          </Reveal>
        ))}
      </ol>
    </section>
  )
}
