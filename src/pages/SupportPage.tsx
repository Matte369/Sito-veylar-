import { Button, ButtonLink } from '../components/Button'
import Reveal from '../components/Reveal'
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
              <ButtonLink href={CROWDFUNDING_URL} external icon="out">
                {t.support.donate}
              </ButtonLink>
            ) : (
              <Button disabled icon="out">
                {t.support.donate}
              </Button>
            )}
            <p className="text-sm text-steel">
              {ready ? t.support.ready : t.support.soon}
            </p>
          </div>
        </div>

        <Reveal delay={120}>
          <div className="rounded-[2rem] bg-ink/[0.03] p-1.5 ring-1 ring-ink/[0.06]">
            <div className="overflow-hidden rounded-[calc(2rem-0.375rem)] bg-[#c9c8c5] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
              <img src="design/three-quarter-front.jpg" alt="VEYLAR" width={694} height={215} className="aspect-[694/215] w-full object-cover" />
            </div>
          </div>
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
