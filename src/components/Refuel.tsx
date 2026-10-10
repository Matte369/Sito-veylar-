import Reveal from './Reveal'
import ItalyMap from './ItalyMap'
import { COST_PER_100KM, REFUEL_POINTS, eur } from '../config'

export default function Refuel() {
  return (
    <section id="refuel" className="scroll-mt-16 border-t border-ink/10 bg-paper">
      <div className="mx-auto grid max-w-[1440px] items-center gap-16 px-5 py-28 sm:px-8 md:grid-cols-[7fr_5fr] md:px-12 md:py-36">
        <div>
          <Reveal>
            <p className="font-wide text-[clamp(4.5rem,13vw,11rem)] font-medium leading-[0.9] tracking-[-0.04em] text-ink tabular-nums">
              {REFUEL_POINTS.toLocaleString('en-US')}
            </p>
            <h2 className="mt-6 max-w-xl font-wide text-balance text-3xl font-medium leading-[1.05] tracking-[-0.015em] text-ink sm:text-4xl">
              Refuelling points across Italy.
            </h2>
            <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-graphite">
              About {REFUEL_POINTS.toLocaleString('en-US')} points across the country where you can refuel, from the
              Alps to Sicily. No new infrastructure to wait for.
            </p>
          </Reveal>

          <Reveal delay={150} className="mt-14 flex flex-wrap items-end gap-x-6 gap-y-2 border-t border-ink/15 pt-8">
            <p className="font-wide text-6xl font-medium tracking-[-0.03em] text-ink tabular-nums">
              {eur(COST_PER_100KM, 2)}
            </p>
            <p className="pb-2 text-lg text-graphite">
              about every <span className="text-ink">100 km</span>
            </p>
          </Reveal>
        </div>

        <Reveal delay={100} className="mx-auto w-full max-w-[26rem]">
          <ItalyMap className="h-auto w-full" />
        </Reveal>
      </div>
    </section>
  )
}
