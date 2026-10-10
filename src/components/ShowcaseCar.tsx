import { useEffect, useRef } from 'react'
import { VeylarStage } from '../three/stage'

/** The assembled car turning slowly in its own studio, for dedicated pages. */
export default function ShowcaseCar({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let stage: VeylarStage
    try {
      stage = new VeylarStage(canvas)
    } catch {
      return
    }
    stage.centered = true
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let w = 0
    let h = 0
    const start = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (canvas.clientWidth !== w || canvas.clientHeight !== h) {
        w = canvas.clientWidth
        h = canvas.clientHeight
        stage.resize(w, h)
      }
      const t = (now - start) / 1000
      stage.update(0, t, false, reduce ? -0.7 : -0.7 + t * 0.18)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      stage.dispose()
    }
  }, [])

  return (
    <div className={`studio overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
    </div>
  )
}
