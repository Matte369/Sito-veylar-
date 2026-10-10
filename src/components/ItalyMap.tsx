import { useEffect, useMemo, useRef, useState } from 'react'
import { ITALY } from '../data/italy'

const STEP = 0.2 // degrees of latitude between dots
const KX = Math.cos((42 * Math.PI) / 180) // equirectangular correction at Italy's latitude

function inside(lon: number, lat: number, ring: [number, number][]) {
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** Dot-matrix map of Italy that fills in from north to south when it scrolls into view. */
export default function ItalyMap({ className = '' }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const [shown, setShown] = useState(false)

  const { dots, width, height } = useMemo(() => {
    const all = ITALY.flat()
    const minLon = Math.min(...all.map((p) => p[0]))
    const maxLon = Math.max(...all.map((p) => p[0]))
    const minLat = Math.min(...all.map((p) => p[1]))
    const maxLat = Math.max(...all.map((p) => p[1]))
    const out: { x: number; y: number; d: number }[] = []
    for (let lat = maxLat; lat >= minLat; lat -= STEP) {
      for (let lon = minLon; lon <= maxLon; lon += STEP / KX) {
        if (ITALY.some((r) => inside(lon, lat, r))) {
          out.push({ x: (lon - minLon) * KX, y: maxLat - lat, d: (maxLat - lat) / (maxLat - minLat) })
        }
      }
    }
    return { dots: out, width: (maxLon - minLon) * KX, height: maxLat - minLat }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setShown(true), io.disconnect()), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <svg
      ref={ref}
      viewBox={`-0.2 -0.2 ${width + 0.4} ${height + 0.4}`}
      className={className}
      role="img"
      aria-label="Map of Italy"
    >
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={0.062}
          className="fill-ink motion-safe:transition-opacity motion-safe:duration-700"
          style={{ opacity: shown ? 0.85 : 0.12, transitionDelay: `${Math.round(d.d * 1200)}ms` }}
        />
      ))}
    </svg>
  )
}
