import { useId, useState } from 'react'
import Reveal from './Reveal'
import RevealText from './RevealText'
import { COST_PER_100KM } from '../config'
import { fill, useFormat, useLang } from '../i18n'
import { useTween } from '../lib/motion'

const MIN_KM = 5000
const MAX_KM = 60000

function NumberField(props: {
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
        {props.label}
      </label>
      <div className="flex items-center rounded-xl border border-ink/20 bg-paper transition-colors focus-within:border-ink">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={props.value}
          step={props.step}
          min={props.min}
          max={props.max}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!Number.isNaN(v)) props.onChange(Math.min(props.max, Math.max(props.min, v)))
          }}
          className="w-full bg-transparent px-4 py-3 font-mono text-ink tabular-nums outline-none"
        />
        <span className="whitespace-nowrap pr-4 text-sm text-steel">{props.suffix}</span>
      </div>
    </div>
  )
}

export default function Savings() {
  const { t } = useLang()
  const { eur, num } = useFormat()
  const [km, setKm] = useState(15000)
  const [price, setPrice] = useState(1.8)
  const [consumption, setConsumption] = useState(6.5)
  const sliderId = useId()

  const veylar = (km / 100) * COST_PER_100KM
  const petrol = (km / 100) * consumption * price
  const saving = Math.max(0, petrol - veylar)
  const max = Math.max(petrol, veylar, 1)
  const shownSaving = useTween(saving)
  const shownKm = useTween(km, 300)

  return (
    <section id="savings" className="scroll-mt-16 mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:px-12 md:py-40">
      <div className="max-w-3xl">
        <RevealText
          key={t.savings.title}
          text={t.savings.title}
          className="font-wide text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-ink sm:text-5xl lg:text-6xl"
        />
        <Reveal delay={200}>
          <p className="mt-6 max-w-[36rem] text-lg leading-relaxed text-graphite">{t.savings.sub}</p>
        </Reveal>
      </div>

      <Reveal delay={150} className="mt-16 rounded-[2.25rem] bg-ink/[0.03] p-1.5 ring-1 ring-ink/[0.06]">
        <div className="grid gap-12 rounded-[calc(2.25rem-0.375rem)] bg-paper p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] sm:p-10 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:p-14">
        <div className="flex flex-col gap-10">
          <div>
            <label htmlFor={sliderId} className="text-sm text-graphite">
              {t.savings.km}
            </label>
            <p className="mt-2 font-wide text-5xl font-medium tracking-[-0.03em] text-ink tabular-nums">
              {num(Math.round(shownKm / 100) * 100)}
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
              className="mt-6 w-full cursor-pointer accent-ink"
            />
            <div className="mt-2 flex justify-between font-mono text-xs text-steel">
              <span>{num(MIN_KM)}</span>
              <span>{num(MAX_KM)}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label={t.savings.price} value={price} onChange={setPrice} step={0.01} min={0.5} max={5} suffix="€/l" />
            <NumberField label={t.savings.consumption} value={consumption} onChange={setConsumption} step={0.1} min={2} max={20} suffix="l/100 km" />
          </div>
        </div>

        <div className="flex flex-col justify-between gap-10">
          <div aria-live="polite">
            <p className="text-sm text-graphite">{t.savings.youSave}</p>
            <p className="mt-2 font-wide text-[clamp(3.5rem,8vw,6.5rem)] font-medium leading-none tracking-[-0.04em] text-accent tabular-nums">
              {eur(shownSaving)}
            </p>
            <p className="mt-3 text-graphite">{fill(t.savings.fiveYears, { value: eur(saving * 5) })}</p>
          </div>

          <div className="flex flex-col gap-6">
            {[
              { name: t.savings.petrolCar, value: petrol, tone: 'bg-steel/45' },
              { name: 'VEYLAR', value: veylar, tone: 'bg-ink' },
            ].map((row) => (
              <div key={row.name}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium text-ink">{row.name}</span>
                  <span className="font-mono text-sm text-ink tabular-nums">
                    {eur(row.value)} {t.savings.perYear}
                  </span>
                </div>
                <div
                  className={`mt-2 h-3 origin-left rounded-full ${row.tone} motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]`}
                  style={{ transform: `scaleX(${Math.max(0.02, row.value / max)})` }}
                />
              </div>
            ))}
          </div>
        </div>
        </div>
      </Reveal>

      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-steel">{fill(t.savings.note, { cost: eur(COST_PER_100KM, 2) })}</p>
    </section>
  )
}
