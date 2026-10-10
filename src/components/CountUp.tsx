import { useEffect, useState } from 'react'
import { reducedMotion, useInView } from '../lib/motion'
import { useFormat } from '../i18n'

/** Number that counts up from zero the first time it scrolls into view. */
export default function CountUp({ value, digits = 0, duration = 1600, className = '' }: {
  value: number
  digits?: number
  duration?: number
  className?: string
}) {
  const [ref, inView] = useInView<HTMLSpanElement>(0.4)
  const { num } = useFormat()
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reducedMotion()) {
      setShown(value)
      return
    }
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setShown(value * (1 - Math.pow(2, -10 * t)))
      if (t < 1) raf = requestAnimationFrame(step)
      else setShown(value)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration])

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {num(shown, digits)}
    </span>
  )
}
