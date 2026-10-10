import RevealText from './RevealText'
import { ButtonLink } from './Button'
import { useLang } from '../i18n'

export default function SupportBand() {
  const { t } = useLang()
  return (
    <section className="px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="relative mx-auto max-w-[1420px] overflow-hidden rounded-[2.5rem] bg-ink text-paper">
        <img
          src="design/three-quarter-rear.jpg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/20" aria-hidden="true" />
        <div className="relative flex flex-col gap-10 px-6 py-20 sm:px-12 md:flex-row md:items-end md:justify-between md:py-28 lg:px-16">
          <RevealText
            key={t.band.title}
            text={t.band.title}
            className="max-w-3xl font-wide text-balance text-5xl font-medium leading-[0.98] tracking-[-0.02em] sm:text-6xl lg:text-7xl"
          />
          <ButtonLink href="#support" variant="glow" className="self-start md:self-auto">
            {t.band.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
