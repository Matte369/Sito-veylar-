import { ArrowUpRight } from 'lucide-react'
import Reveal from '../components/Reveal'
import ShowcaseCar from '../components/ShowcaseCar'
import { CROWDFUNDING_URL } from '../config'
import RevealText from '../components/RevealText'
import { useLang } from '../i18n'

export default function SupportPage() {
  const { t } = useLang()
  const ready = CROWDFUNDING_URL.length > 0

  return (
    <div className="pt-16">
      <section className="mx-auto grid max-w-[1440px] gap-12 px-5 py-16 sm:px-8 md:px-12 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[6fr_6fr] lg:items-center lg:py-20">
        <div>
          <RevealText
            key={t.support.title}
            as="h1"
            text={t.support.title}
            className="font-wide text-balance text-5xl font-medium leading-[0.98] tracking-[-0.02em] text-ink sm:text-6xl lg:text-7xl"
          />
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-graphite motion-safe:animate-[fadeUp_900ms_300ms_both]">{t.support.body}</p>

          <div className="mt-10 flex flex-col items-start gap-3 motion-safe:animate-[fadeUp_900ms_450ms_both]">
            {ready ? (
              <a
                href={CROWDFUNDING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-base font-medium text-paper transition-colors duration-300 hover:bg-graphite active:scale-[0.98]"
              >
                {t.support.donate}
                <ArrowUpRight size={18} strokeWidth={1.75} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-ink/40 px-8 py-4 text-base font-medium text-paper"
              >
                {t.support.donate}
                <ArrowUpRight size={18} strokeWidth={1.75} />
              </span>
            )}
            <p className="text-sm text-steel">
              {ready ? t.support.ready : t.support.soon}
            </p>
          </div>
        </div>

        <Reveal delay={120}>
          <ShowcaseCar className="aspect-[4/3] w-full rounded-3xl" />
        </Reveal>
      </section>

      <section className="border-t border-ink/10 bg-paper">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 md:px-12">
          <Reveal>
            <h2 className="font-wide text-3xl font-medium tracking-[-0.015em] text-ink sm:text-4xl">{t.support.fundsTitle}</h2>
          </Reveal>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {t.support.uses.map((u, i) => (
              <Reveal as="li" key={u.title} delay={i * 120} className="border-t border-ink/15 pt-6">
                <h3 className="font-wide text-xl font-medium text-ink">{u.title}</h3>
                <p className="mt-3 max-w-[22rem] leading-relaxed text-graphite">{u.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    </div>
  )
}
