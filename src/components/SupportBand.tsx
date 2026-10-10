import { ArrowRight } from 'lucide-react'
import Reveal from './Reveal'

export default function SupportBand() {
  return (
    <section className="border-t border-ink/10">
      <Reveal className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-24 sm:px-8 md:flex-row md:items-end md:justify-between md:px-12">
        <h2 className="max-w-3xl font-wide text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-ink sm:text-5xl">
          Help bring VEYLAR to the road.
        </h2>
        <a
          href="#support"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-ink px-7 py-4 text-base font-medium text-paper transition-colors duration-300 hover:bg-graphite active:scale-[0.98] md:self-auto"
        >
          Support us
          <ArrowRight size={18} strokeWidth={1.75} />
        </a>
      </Reveal>
    </section>
  )
}
