import { ArrowRight } from 'lucide-react'
import RevealText from './RevealText'
import { useLang } from '../i18n'

export default function SupportBand() {
  const { t } = useLang()
  return (
    <section className="border-t border-ink/10">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-5 py-28 sm:px-8 md:flex-row md:items-end md:justify-between md:px-12">
        <RevealText
          key={t.band.title}
          text={t.band.title}
          className="max-w-4xl font-wide text-balance text-5xl font-medium leading-[0.98] tracking-[-0.02em] text-ink sm:text-6xl lg:text-7xl"
        />
        <a
          href="#support"
          className="group inline-flex shrink-0 items-center gap-3 self-start rounded-full bg-accent px-8 py-5 text-base font-medium text-paper transition-[background-color,transform] duration-300 hover:bg-ink active:scale-[0.98] md:self-auto"
        >
          {t.band.cta}
          <ArrowRight size={18} strokeWidth={1.75} className="transition-transform duration-300 group-hover:translate-x-1" />
        </a>
      </div>
    </section>
  )
}
