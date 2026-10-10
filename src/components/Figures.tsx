import Reveal from './Reveal'
import RevealText from './RevealText'
import CountUp from './CountUp'
import { FIGURES } from '../content'
import { useLang } from '../i18n'

export default function Figures() {
  const { t } = useLang()
  return (
    <section id="figures" className="scroll-mt-16 mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12 md:py-40">
      <div className="grid gap-6 lg:grid-cols-[7fr_5fr] lg:items-end">
        <RevealText
          key={t.figures.title}
          text={t.figures.title}
          className="font-wide text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-ink sm:text-5xl lg:text-6xl"
        />
        <Reveal delay={200}>
          <p className="max-w-[26rem] text-lg leading-relaxed text-graphite lg:justify-self-end">{t.figures.sub}</p>
        </Reveal>
      </div>

      <dl className="mt-20 grid md:grid-cols-3">
        {FIGURES.map((f, i) => (
          <Reveal key={f.unit} delay={i * 140} className={`relative py-10 md:py-4 ${i > 0 ? 'md:pl-10' : ''} ${i < 2 ? 'md:pr-10' : ''}`}>
            {/* Hairline divider between figures. */}
            <span
              aria-hidden="true"
              className={`absolute left-0 top-0 h-px w-full origin-left bg-ink/20 md:h-full md:w-px md:origin-top ${i === 0 ? 'md:hidden' : ''}`}
            />
            <dt className="text-sm font-medium text-graphite">{t.figures.items[i].label}</dt>
            <dd className="mt-6 flex items-baseline">
              <CountUp
                value={f.value}
                digits={f.digits}
                duration={1800 + i * 200}
                className="font-wide text-[clamp(4.5rem,8vw,7.5rem)] font-medium leading-none tracking-[-0.04em] text-ink"
              />
              <span className="ml-2 font-wide text-2xl font-medium text-accent lg:text-3xl">{f.unit}</span>
            </dd>
            <dd className="mt-4 max-w-[18rem] leading-relaxed text-graphite">{t.figures.items[i].note}</dd>
          </Reveal>
        ))}
      </dl>

      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-steel">{t.figures.note}</p>
    </section>
  )
}
