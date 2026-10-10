import { useId, useState } from 'react'
import Reveal from './Reveal'
import { COST_PER_100KM, eur } from '../config'

const MIN_KM = 5000
const MAX_KM = 60000

function NumberField({
  label,
  value,
  onChange,
  step,
  suffix,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step: number
  suffix: string
  min: number
  max: number
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm text-graphite">
        {label}
      </label>
      <div className="flex items-center rounded-xl border border-ink/20 bg-paper focus-within:border-ink">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
          }}
          className="w-full bg-transparent px-4 py-3 font-mono text-ink tabular-nums outline-none"
        />
        <span className="whitespace-nowrap pr-4 text-sm text-steel">{suffix}</span>
      </div>
    </div>
  )
}

export default function Savings() {
  const [km, setKm] = useState(15000)
  const [price, setPrice] = useState(1.8)
  const [consumption, setConsumption] = useState(6.5)
  const sliderId = useId()

  const veylar = (km / 100) * COST_PER_100KM
  const petrol = (km / 100) * consumption * price
  const saving = Math.max(0, petrol - veylar)
  const max = Math.max(petrol, veylar, 1)

  return (
    <section id="savings" className="scroll-mt-16 mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12 md:py-36">
      <Reveal className="max-w-3xl">
        <h2 className="font-wide text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-ink sm:text-5xl lg:text-6xl">
          How much you save in a year.
        </h2>
        <p className="mt-6 max-w-[36rem] text-lg leading-relaxed text-graphite">
          Choose how far you drive and compare a year with VEYLAR to a year with a petrol car.
        </p>
      </Reveal>

      <Reveal delay={120} className="mt-16 grid gap-12 rounded-3xl bg-paper p-6 sm:p-10 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:p-14">
        <div className="flex flex-col gap-10">
          <div>
            <label htmlFor={sliderId} className="text-sm text-graphite">
              Kilometres per year
            </label>
            <p className="mt-2 font-wide text-5xl font-medium tracking-[-0.03em] text-ink tabular-nums">
              {km.toLocaleString('en-US')}
              <span className="ml-2 text-2xl text-steel">km</span>
            </p>
            <input
              id={sliderId}
              type="range"
              min={MIN_KM}
              max={MAX_KM}
              step={1000}
              value={km}
              onChange={(e) => setKm(Number(e.target.value))}
              className="mt-6 w-full accent-ink"
            />
            <div className="mt-2 flex justify-between font-mono text-xs text-steel">
              <span>{MIN_KM.toLocaleString('en-US')}</span>
              <span>{MAX_KM.toLocaleString('en-US')}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Petrol price" value={price} onChange={setPrice} step={0.01} min={0.5} max={5} suffix="€/l" />
            <NumberField
              label="Petrol car consumption"
              value={consumption}
              onChange={setConsumption}
              step={0.1}
              min={2}
              max={20}
              suffix="l/100 km"
            />
          </div>
        </div>

        <div className="flex flex-col justify-between gap-10">
          <div aria-live="polite">
            <p className="text-sm text-graphite">You save every year</p>
            <p className="mt-2 font-wide text-[clamp(3.5rem,8vw,6.5rem)] font-medium leading-none tracking-[-0.04em] text-accent tabular-nums">
              {eur(saving)}
            </p>
            <p className="mt-3 text-graphite">
              That is {eur(saving * 5)} over five years.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {[
              { name: 'Petrol car', value: petrol, tone: 'bg-steel/45' },
              { name: 'VEYLAR', value: veylar, tone: 'bg-ink' },
            ].map((row) => (
              <div key={row.name}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium text-ink">{row.name}</span>
                  <span className="font-mono text-sm text-ink tabular-nums">{eur(row.value)} / year</span>
                </div>
                <div
                  className={`mt-2 h-3 rounded-full ${row.tone} motion-safe:transition-[width] motion-safe:duration-500`}
                  style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-steel">
        Estimate. VEYLAR cost based on about {eur(COST_PER_100KM, 2)} every 100 km. Petrol price and consumption are
        averages you can change.
      </p>
    </section>
  )
}
