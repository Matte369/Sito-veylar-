import { useEffect, useRef, useState } from 'react'
import Lenis from 'lenis'

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let lenis: Lenis | null = null

/** Smooth, inertial page scroll. Off under reduced motion. */
export function startSmoothScroll() {
  if (reducedMotion() || lenis) return () => {}
  lenis = new Lenis({ lerp: 0.11, smoothWheel: true })
  let raf = 0
  const loop = (time: number) => {
    lenis?.raf(time)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => {
    cancelAnimationFrame(raf)
    lenis?.destroy()
    lenis = null
  }
}

/** Scrolls to a y position or element, smoothly when Lenis is running. */
export function scrollToTarget(target: number | HTMLElement, opts: { offset?: number; immediate?: boolean } = {}) {
  const offset = opts.offset ?? 0
  if (lenis) {
    lenis.scrollTo(target, { offset, immediate: opts.immediate })
    return
  }
  const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY
  window.scrollTo({ top: y + offset, behavior: opts.immediate ? 'auto' : 'smooth' })
}

/** True once the element has entered the viewport. */
export function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, inView] as const
}

/**
 * Runs `onFrame(progress)` every animation frame while the element is near the viewport.
 * Progress is 0 when the element's top reaches the viewport top, 1 when its bottom reaches the viewport bottom
 * (the usual mapping for a tall section with a sticky child).
 */
export function useScrollFrames<T extends HTMLElement>(
  onFrame: (progress: number, rect: DOMRect) => void,
  mode: 'sticky' | 'through' = 'sticky',
) {
  const ref = useRef<T>(null)
  const cb = useRef(onFrame)
  cb.current = onFrame

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let active = false
    const tick = () => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const p =
        mode === 'sticky'
          ? -r.top / Math.max(1, r.height - vh)
          : (vh - r.top) / Math.max(1, r.height + vh)
      cb.current(Math.min(1, Math.max(0, p)), r)
      if (active) raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([e]) => {
      active = e.isIntersecting
      cancelAnimationFrame(raf)
      if (active) raf = requestAnimationFrame(tick)
      else tick()
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [mode])

  return ref
}

/** Eases a displayed number toward `value`. */
export function useTween(value: number, duration = 600) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (reducedMotion()) {
      setShown(value)
      return
    }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const e = 1 - Math.pow(1 - t, 3)
      const v = a + (value - a) * e
      from.current = v
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return shown
}
