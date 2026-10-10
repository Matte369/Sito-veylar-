import Portrait from './Portrait'
import RevealText from './RevealText'
import { TEAM } from '../content'
import { useLang } from '../i18n'
import { useInView } from '../lib/motion'

function Member({ i }: { i: number }) {
  const { t } = useLang()
  const [ref, inView] = useInView<HTMLLIElement>(0.25)
  const m = TEAM[i]
  const copy = t.team.members[i]
  const title = m.name || copy.role
  const alt = m.name ? `${m.name}, ${copy.role} ${t.team.at}` : `${copy.role} ${t.team.at}`
  return (
    <li ref={ref} className={`group ${i === 1 ? 'lg:mt-24' : ''} ${i === 2 ? 'lg:mt-12' : ''}`}>
      {/* Photo is uncovered by a wipe from the bottom when it scrolls into view. */}
      <div
        className="aspect-[4/5] overflow-hidden rounded-2xl motion-safe:transition-[clip-path] motion-safe:duration-[1200ms] motion-safe:ease-[cubic-bezier(0.65,0,0.35,1)]"
        style={{ clipPath: inView ? 'inset(0 0 0 0 round 16px)' : 'inset(100% 0 0 0 round 16px)', transitionDelay: `${i * 150}ms` }}
      >
        <Portrait src={m.photo} alt={alt} initials={m.initials} soon={t.team.photoSoon} />
      </div>
      <div
        className={`motion-safe:transition-all motion-safe:duration-700 ${inView ? 'translate-y-0 opacity-100' : 'motion-safe:translate-y-4 motion-safe:opacity-0'}`}
        style={{ transitionDelay: `${400 + i * 150}ms` }}
      >
        <h3 className="mt-6 font-wide text-2xl font-medium text-ink">{title}</h3>
        <p className="mt-1 text-sm font-medium text-accent">{m.name ? copy.role : t.team.comingSoon}</p>
        <p className="mt-3 max-w-[22rem] leading-relaxed text-graphite">{copy.bio}</p>
      </div>
    </li>
  )
}

export default function Team() {
  const { t } = useLang()
  return (
    <section id="team" className="scroll-mt-16 border-t border-ink/10 bg-paper">
      <div className="mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12 md:py-40">
        <RevealText
          key={t.team.title}
          text={t.team.title}
          className="max-w-3xl font-wide text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-ink sm:text-5xl lg:text-6xl"
        />
        <ul className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {TEAM.map((_, i) => (
            <Member key={i} i={i} />
          ))}
        </ul>
      </div>
    </section>
  )
}
