import Reveal from './Reveal'
import { FIGURES } from '../content'

export default function Figures() {
  return (
    <section id="figures" className="scroll-mt-16 mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12 md:py-36">
      <Reveal className="max-w-3xl">
        <h2 className="font-wide text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-ink sm:text-5xl lg:text-6xl">
          The numbers behind the platform.
        </h2>
        <p className="mt-6 max-w-[36rem] text-lg leading-relaxed text-graphite">
          Validated figures for the VEYLAR energy system.
        </p>
      </Reveal>

      <dl className="mt-16 grid border-t border-ink/15 md:grid-cols-3">
        {FIGURES.map((f, i) => (
          <Reveal
            key={f.label}
            delay={i * 120}
            className={`py-10 md:py-12 ${i > 0 ? 'border-t border-ink/15 md:border-l md:border-t-0 md:pl-10' : ''} ${i < 2 ? 'md:pr-10' : ''}`}
          >
            <dt className="text-sm font-medium text-graphite">{f.label}</dt>
            <dd className="mt-6">
              <span className="font-wide text-7xl font-medium tracking-[-0.03em] text-ink tabular-nums lg:text-8xl">{f.value}</span>
              <span className="ml-2 font-wide text-2xl font-medium text-accent lg:text-3xl">{f.unit}</span>
            </dd>
            <dd className="mt-4 max-w-[18rem] leading-relaxed text-graphite">{f.note}</dd>
          </Reveal>
        ))}
      </dl>

      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-steel">
        Figures from the technical validation of the energy system. They are not type-approval (homologation) values,
        which will be measured on the road-going vehicle.
      </p>
    </section>
  )
}
