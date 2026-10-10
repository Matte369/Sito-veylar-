import { useMemo, useRef } from 'react'
import { ITALY } from '../data/italy'
import { COST_PER_100KM, REFUEL_POINTS } from '../config'
import { fill, useFormat, useLang } from '../i18n'
import { useScrollFrames } from '../lib/motion'

const KX = Math.cos((42 * Math.PI) / 180) // equirectangular correction at Italy's latitude
const TRIP_KM = 1200
const PETROL_L_100 = 6.5
const PETROL_EUR_L = 1.8
const STATION_DOTS = 1500 // each dot stands for roughly 14 stations

// Motorway route, Milan to Reggio Calabria (A1, A30, A2). [lon, lat]
const ROUTE: [number, number][] = [
  [9.19, 45.46], [9.69, 45.05], [10.33, 44.8], [11.34, 44.49], [11.25, 43.77], [11.88, 43.46],
  [12.11, 42.72], [12.5, 41.9], [13.35, 41.64], [14.33, 41.07], [14.77, 40.68], [15.76, 40.12],
  [16.25, 39.3], [16.3, 38.97], [16.1, 38.68], [15.65, 38.11],
]
const CITIES: { en: string; it: string; at: [number, number] }[] = [
  { en: 'Milan', it: 'Milano', at: [9.19, 45.46] },
  { en: 'Bologna', it: 'Bologna', at: [11.34, 44.49] },
  { en: 'Florence', it: 'Firenze', at: [11.25, 43.77] },
  { en: 'Rome', it: 'Roma', at: [12.5, 41.9] },
  { en: 'Salerno', it: 'Salerno', at: [14.77, 40.68] },
  { en: 'Cosenza', it: 'Cosenza', at: [16.25, 39.3] },
  { en: 'Reggio Calabria', it: 'Reggio Calabria', at: [15.65, 38.11] },
]

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function inside(lon: number, lat: number, ring: [number, number][]) {
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** Catmull-Rom through the route waypoints, sampled evenly. */
function sampleRoute(points: [number, number][], perSegment = 24) {
  const out: [number, number][] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment
      const t2 = t * t
      const t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(points[points.length - 1])
  return out
}

export default function Journey() {
  const { t, lang } = useLang()
  const fmt = useFormat()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  const n1 = useRef<HTMLSpanElement>(null)
  const n2 = useRef<HTMLSpanElement>(null)
  const n3 = useRef<HTMLSpanElement>(null)
  const barV = useRef<HTMLDivElement>(null)
  const barP = useRef<HTMLDivElement>(null)
  const fmtRef = useRef(fmt)
  fmtRef.current = fmt
  const langRef = useRef(lang)
  langRef.current = lang

  const veylarTrip = (TRIP_KM / 100) * COST_PER_100KM
  const petrolTrip = (TRIP_KM / 100) * PETROL_L_100 * PETROL_EUR_L

  const geo = useMemo(() => {
    const all = ITALY.flat()
    const minLon = Math.min(...all.map((p) => p[0]))
    const maxLon = Math.max(...all.map((p) => p[0]))
    const minLat = Math.min(...all.map((p) => p[1]))
    const maxLat = Math.max(...all.map((p) => p[1]))
    const rand = rng(21000)
    const stations: { lon: number; lat: number; t: number }[] = []
    while (stations.length < STATION_DOTS) {
      const lon = minLon + rand() * (maxLon - minLon)
      const lat = minLat + rand() * (maxLat - minLat)
      if (ITALY.some((r) => inside(lon, lat, r))) stations.push({ lon, lat, t: 0.05 + rand() * 0.9 })
    }
    const route = sampleRoute(ROUTE)
    const cum = [0]
    for (let i = 1; i < route.length; i++) {
      const dx = (route[i][0] - route[i - 1][0]) * KX
      const dy = route[i][1] - route[i - 1][1]
      cum.push(cum[i - 1] + Math.hypot(dx, dy))
    }
    const total = cum[cum.length - 1]
    const cities = CITIES.map((c) => {
      let best = 0
      route.forEach((p, i) => {
        if (Math.hypot(p[0] - c.at[0], p[1] - c.at[1]) < Math.hypot(route[best][0] - c.at[0], route[best][1] - c.at[1])) best = i
      })
      return { ...c, f: cum[best] / total }
    })
    return { minLon, maxLon, minLat, maxLat, stations, route, cum, total, cities }
  }, [])

  const sectionRef = useScrollFrames<HTMLElement>((p) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const s1 = smooth(0.02, 0.26, p)
    const s2 = smooth(0.36, 0.66, p)
    const s3 = smooth(0.72, 0.88, p)
    const f = fmtRef.current

    // Copy steps.
    const weights = [1 - smooth(0.27, 0.33, p), smooth(0.3, 0.36, p) * (1 - smooth(0.66, 0.72, p)), smooth(0.69, 0.75, p)]
    weights.forEach((w, i) => {
      const el = stepRefs.current[i]
      if (!el) return
      el.style.opacity = String(w)
      el.style.translate = `0 ${(1 - w) * 24}px`
      el.style.visibility = w < 0.01 ? 'hidden' : 'visible'
    })
    if (n1.current) n1.current.textContent = f.num(Math.round(REFUEL_POINTS * s1))
    if (n2.current) n2.current.textContent = f.num(Math.round(TRIP_KM * s2))
    if (n3.current) n3.current.textContent = f.eur(veylarTrip * s3, 2)
    if (barV.current) barV.current.style.transform = `scaleX(${(veylarTrip / petrolTrip) * s3})`
    if (barP.current) barP.current.style.transform = `scaleX(${s3})`

    // Map.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
    }
    const g = canvas.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, cw, ch)
    const mw = (geo.maxLon - geo.minLon) * KX
    const mh = geo.maxLat - geo.minLat
    const pad = 28
    const scale = Math.min((cw - pad * 2) / mw, (ch - pad * 2) / mh)
    const ox = (cw - mw * scale) / 2
    const oy = (ch - mh * scale) / 2
    const X = (lon: number) => ox + (lon - geo.minLon) * KX * scale
    const Y = (lat: number) => oy + (geo.maxLat - lat) * scale

    g.beginPath()
    for (const ring of ITALY) {
      ring.forEach(([lon, lat], i) => (i ? g.lineTo(X(lon), Y(lat)) : g.moveTo(X(lon), Y(lat))))
      g.closePath()
    }
    g.fillStyle = '#dfe2e6'
    g.fill()
    g.strokeStyle = 'rgba(21,23,26,0.22)'
    g.lineWidth = 1
    g.stroke()

    const dim = 1 - 0.45 * s2
    g.fillStyle = '#15171a'
    for (const st of geo.stations) {
      const a = smooth(st.t - 0.06, st.t, s1)
      if (a <= 0) continue
      g.globalAlpha = 0.6 * a * dim
      g.beginPath()
      g.arc(X(st.lon), Y(st.lat), 1.5, 0, Math.PI * 2)
      g.fill()
    }
    g.globalAlpha = 1

    if (s2 > 0) {
      const target = geo.total * s2
      // Full route, faint and dashed.
      g.setLineDash([3, 5])
      g.strokeStyle = 'rgba(21,23,26,0.25)'
      g.lineWidth = 1.5
      g.beginPath()
      geo.route.forEach(([lon, lat], i) => (i ? g.lineTo(X(lon), Y(lat)) : g.moveTo(X(lon), Y(lat))))
      g.stroke()
      g.setLineDash([])
      // Driven part.
      g.strokeStyle = '#d9531e'
      g.lineWidth = 3.5
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.beginPath()
      let hx = X(geo.route[0][0])
      let hy = Y(geo.route[0][1])
      g.moveTo(hx, hy)
      for (let i = 1; i < geo.route.length; i++) {
        if (geo.cum[i] <= target) {
          hx = X(geo.route[i][0])
          hy = Y(geo.route[i][1])
          g.lineTo(hx, hy)
        } else {
          const k = (target - geo.cum[i - 1]) / (geo.cum[i] - geo.cum[i - 1])
          hx = X(geo.route[i - 1][0] + (geo.route[i][0] - geo.route[i - 1][0]) * k)
          hy = Y(geo.route[i - 1][1] + (geo.route[i][1] - geo.route[i - 1][1]) * k)
          g.lineTo(hx, hy)
          break
        }
      }
      g.stroke()

      // Cities passed so far.
      g.font = '500 12px "IBM Plex Mono", ui-monospace, monospace'
      g.textBaseline = 'middle'
      for (const c of geo.cities) {
        const a = smooth(c.f - 0.02, c.f + 0.02, s2)
        if (a <= 0) continue
        const cx = X(c.at[0])
        const cy = Y(c.at[1])
        g.globalAlpha = a
        g.fillStyle = '#15171a'
        g.beginPath()
        g.arc(cx, cy, 3.5, 0, Math.PI * 2)
        g.fill()
        const name = c[langRef.current as 'en' | 'it']
        const left = c.at[0] > 14.5
        g.textAlign = left ? 'right' : 'left'
        g.lineWidth = 4
        g.strokeStyle = '#f3f4f5'
        g.strokeText(name, cx + (left ? -10 : 10), cy)
        g.fillText(name, cx + (left ? -10 : 10), cy)
      }
      g.globalAlpha = 1

      // Moving marker with a soft pulse.
      const pulse = (performance.now() / 1200) % 1
      g.strokeStyle = `rgba(217,83,30,${0.45 * (1 - pulse)})`
      g.lineWidth = 2
      g.beginPath()
      g.arc(hx, hy, 8 + pulse * 16, 0, Math.PI * 2)
      g.stroke()
      g.fillStyle = '#d9531e'
      g.beginPath()
      g.arc(hx, hy, 7, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#f3f4f5'
      g.lineWidth = 2.5
      g.stroke()
    }
  })

  const big = 'font-wide text-[clamp(3.6rem,9vw,8.5rem)] font-medium leading-[0.9] tracking-[-0.04em] text-ink tabular-nums'
  const title = 'mt-5 max-w-md font-wide text-balance text-2xl font-medium leading-[1.08] tracking-[-0.01em] text-ink sm:text-3xl'
  const body = 'mt-4 max-w-[30rem] text-base leading-relaxed text-graphite sm:text-lg'

  return (
    <section id="refuel" ref={sectionRef} aria-label={t.journey.aria} className="relative h-[380vh] scroll-mt-16 bg-paper">
      <div className="sticky top-0 grid h-[100dvh] grid-rows-[minmax(0,1fr)_minmax(0,48%)] overflow-hidden pt-16 lg:grid-cols-[5fr_7fr] lg:grid-rows-1">
        <div className="relative order-2 px-5 pb-8 sm:px-8 md:px-12 lg:order-1 lg:pb-0">
          {/* Step 1: the network */}
          <div ref={(el) => {
              stepRefs.current[0] = el
            }} className="absolute inset-x-5 bottom-8 sm:inset-x-8 md:inset-x-12 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2">
            <p className={big}>
              <span ref={n1}>{fmt.num(0)}</span>
            </p>
            <h2 className={title}>{t.journey.s1Title}</h2>
            <p className={body}>{t.journey.s1Body}</p>
          </div>
          {/* Step 2: one tank, the length of Italy */}
          <div
            ref={(el) => {
              stepRefs.current[1] = el
            }}
            style={{ opacity: 0, visibility: 'hidden' }}
            className="absolute inset-x-5 bottom-8 sm:inset-x-8 md:inset-x-12 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
          >
            <p className={big}>
              <span ref={n2}>{fmt.num(0)}</span>
              <span className="ml-3 align-baseline font-wide text-[0.32em] tracking-normal text-accent">km</span>
            </p>
            <h3 className={title}>{t.journey.s2Title}</h3>
            <p className={body}>{t.journey.s2Body}</p>
          </div>
          {/* Step 3: what the trip costs */}
          <div
            ref={(el) => {
              stepRefs.current[2] = el
            }}
            style={{ opacity: 0, visibility: 'hidden' }}
            className="absolute inset-x-5 bottom-8 sm:inset-x-8 md:inset-x-12 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
          >
            <p className={big}>
              <span ref={n3}>{fmt.eur(0, 2)}</span>
            </p>
            <h3 className={title}>{t.journey.s3Title}</h3>
            <p className={body}>
              {fill(t.journey.s3Body, { cost: fmt.eur(COST_PER_100KM, 2), petrol: fmt.eur(petrolTrip) })}
            </p>
            <div className="mt-8 flex max-w-[30rem] flex-col gap-4">
              {[
                { name: t.journey.veylar, value: fmt.eur(veylarTrip, 2), ref: barV, tone: 'bg-accent' },
                { name: t.journey.petrol, value: fmt.eur(petrolTrip, 2), ref: barP, tone: 'bg-steel/40' },
              ].map((row) => (
                <div key={row.name}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-ink">{row.name}</span>
                    <span className="font-mono text-ink tabular-nums">{row.value}</span>
                  </div>
                  <div ref={row.ref} className={`mt-2 h-2.5 origin-left rounded-full ${row.tone}`} style={{ transform: 'scaleX(0)' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative order-1 min-h-0 lg:order-2">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={t.journey.mapAria} />
          <p className="absolute bottom-4 right-5 hidden text-xs text-steel sm:right-8 md:right-12 lg:block">{t.journey.footnote}</p>
        </div>
      </div>
    </section>
  )
}
