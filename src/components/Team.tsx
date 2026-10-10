import Reveal from './Reveal'
import Portrait from './Portrait'
import { TEAM } from '../content'

export default function Team() {
  return (
    <section id="team" className="scroll-mt-16 border-t border-ink/10 bg-paper">
      <div className="mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12 md:py-36">
        <Reveal className="max-w-3xl">
          <h2 className="font-wide text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-ink sm:text-5xl lg:text-6xl">
            The people building VEYLAR.
          </h2>
        </Reveal>

        <ul className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {TEAM.map((m, i) => {
            const title = m.name || m.role
            return (
              <Reveal as="li" key={m.role} delay={i * 120} className={i === 1 ? 'lg:mt-16' : ''}>
                <Portrait src={m.photo} alt={m.name ? `${m.name}, ${m.role} at VEYLAR` : `${m.role} at VEYLAR`} initials={m.initials} />
                <h3 className="mt-6 font-wide text-2xl font-medium text-ink">{title}</h3>
                <p className="mt-1 text-sm font-medium text-accent">{m.name ? m.role : 'Name coming soon'}</p>
                <p className="mt-3 max-w-[22rem] leading-relaxed text-graphite">{m.bio}</p>
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
