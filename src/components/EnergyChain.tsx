import { useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { useLang } from '../i18n'
import { reducedMotion, useScrollFrames } from '../lib/motion'

/**
 * The energy chain in one oversized line that slides sideways as you scroll:
 * bioethanol and water in, range out. One kinetic band on the page.
 */
export default function EnergyChain() {
  const { t } = useLang()
  const track = useRef<HTMLDivElement>(null)
  const ref = useScrollFrames<HTMLElement>((p) => {
    if (!track.current || reducedMotion()) return
    const max = track.current.scrollWidth - window.innerWidth
    track.current.style.transform = `translate3d(${-Math.max(0, max) * p}px,0,0)`
  }, 'through')

  return (
    <section ref={ref} aria-label={t.chain.join(', ')} className="overflow-hidden border-y border-ink/10 py-10 sm:py-14">
      <div ref={track} className="flex w-max items-center gap-6 whitespace-nowrap px-5 will-change-transform sm:gap-10 sm:px-12" aria-hidden="true">
        {t.chain.map((word, i) => (
          <span key={word} className="flex items-center gap-6 sm:gap-10">
            <span
              className={`font-wide text-[clamp(3rem,9vw,9rem)] font-medium leading-none tracking-[-0.04em] ${
                i === t.chain.length - 1 ? 'text-accent' : 'text-ink'
              }`}
            >
              {word}
            </span>
            {i < t.chain.length - 1 && <ArrowRight className="h-[clamp(2rem,5vw,5rem)] w-[clamp(2rem,5vw,5rem)] shrink-0 text-steel/50" strokeWidth={1.25} />}
          </span>
        ))}
      </div>
    </section>
  )
}
