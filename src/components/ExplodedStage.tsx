import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { CHAPTERS, chapterWeight, VeylarStage, type ChapterId } from '../three/stage'
import { useLang } from '../i18n'
import { scrollToTarget } from '../lib/motion'
import RevealText from './RevealText'

const RAIL: ChapterId[] = ['hero', 'platform', 'drive', 'hydrogen', 'power', 'further']
const LABELS = CHAPTERS.flatMap((c) => c.labels.map((l) => ({ ...l, chapter: c.id, key: `${c.id}-${l.part}` })))

/**
 * Scroll-pinned 3D exploded view. The section is tall; its inner stage stays
 * fixed while page scroll drives the model, the chapter copy and the labels.
 */
export default function ExplodedStage() {
  const { t } = useLang()
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chapterRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const railRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [webgl, setWebgl] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    if (!section || !canvas) return

    let stage: VeylarStage
    try {
      stage = new VeylarStage(canvas)
    } catch {
      setWebgl(false)
      return
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let smoothed = -1
    let lastW = 0
    let lastH = 0
    let first = true
    const start = performance.now()

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w !== lastW || h !== lastH) {
        stage.resize(w, h)
        lastW = w
        lastH = h
      }

      const rect = section.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      const total = rect.height - window.innerHeight
      const target = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)))
      smoothed = smoothed < 0 || reduce ? target : smoothed + (target - smoothed) * 0.1
      const p = smoothed

      stage.update(p, (now - start) / 1000, !reduce)
      if (first) {
        first = false
        setReady(true)
      }

      // The rail marks the chapter whose range is closest to the current progress.
      let active = CHAPTERS[0].id
      let nearest = Infinity
      for (const c of CHAPTERS) {
        const wgt = chapterWeight(c, p)
        const el = chapterRefs.current[c.id]
        if (el) {
          el.style.opacity = String(wgt)
          el.style.translate = `0 ${(1 - wgt) * 28}px`
          el.style.visibility = wgt < 0.01 ? 'hidden' : 'visible'
        }
        const dist = p < c.range[0] ? c.range[0] - p : p > c.range[1] ? p - c.range[1] : 0
        if (dist < nearest) {
          nearest = dist
          active = c.id
        }
      }
      for (const id of RAIL) {
        const el = railRefs.current[id]
        if (el) el.dataset.active = String(id === active)
      }

      for (const l of LABELS) {
        const el = labelRefs.current[l.key]
        if (!el) continue
        const chapter = CHAPTERS.find((c) => c.id === l.chapter)!
        const wgt = chapterWeight(chapter, p, 0.02)
        if (wgt < 0.01) {
          el.style.opacity = '0'
          continue
        }
        const s = stage.project(l.part)
        el.style.opacity = s.inFront ? String(wgt) : '0'
        el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      stage.dispose()
    }
  }, [])

  const jumpTo = (id: ChapterId) => {
    const section = sectionRef.current
    const chapter = CHAPTERS.find((c) => c.id === id)
    if (!section || !chapter) return
    const total = section.offsetHeight - window.innerHeight
    const mid = id === 'hero' ? 0 : (chapter.range[0] + chapter.range[1]) / 2
    scrollToTarget(section.offsetTop + total * Math.min(1, mid))
  }

  const primary =
    'group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors duration-300 hover:bg-graphite active:scale-[0.98]'
  const secondary =
    'inline-flex items-center rounded-full border border-ink/20 px-6 py-3 text-sm font-medium text-ink transition-colors duration-300 hover:border-ink/40 hover:bg-ink/5 active:scale-[0.98]'
  const arrow = <ArrowRight size={16} strokeWidth={1.75} className="transition-transform duration-300 group-hover:translate-x-1" />

  return (
    <section id="technology" ref={sectionRef} aria-label={t.stage.aria} className={webgl ? 'relative h-[620vh]' : 'relative'}>
      <div id="top" className={`studio overflow-hidden ${webgl ? 'sticky top-0 h-[100dvh]' : 'min-h-[100dvh] pt-24'}`}>
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full motion-safe:transition-[opacity,transform] motion-safe:duration-[1400ms] motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] ${
            ready ? 'scale-100 opacity-100' : 'motion-safe:scale-[1.04] opacity-0'
          }`}
          aria-hidden="true"
        />

        {/* Component labels, positioned from the 3D scene every frame. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {LABELS.map((l) => (
            <div
              key={l.key}
              ref={(el) => {
                labelRefs.current[l.key] = el
              }}
              className="absolute left-0 top-0 opacity-0 will-change-transform"
            >
              <span className="absolute -left-[5px] -top-[5px] h-[10px] w-[10px] rounded-full border-2 border-accent bg-paper" />
              <span className="absolute bottom-0 left-0 h-10 w-px origin-bottom bg-ink/40" />
              <span className="absolute bottom-10 left-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper/90 px-3 py-1 font-mono text-[11px] text-ink shadow-[0_6px_18px_-8px_rgba(30,36,44,0.35)] backdrop-blur">
                {t.stage.labels[l.text]}
              </span>
            </div>
          ))}
        </div>

        {/* Chapter copy. Desktop: left column. Mobile: bottom sheet over the studio. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-16 mx-auto max-w-[1440px] px-5 sm:px-8 md:px-12">
          {CHAPTERS.map((c, i) => {
            const isHero = c.id === 'hero'
            const isLast = i === CHAPTERS.length - 1
            const copy = t.stage.chapters[c.id]
            return (
              <div
                key={c.id}
                ref={(el) => {
                  chapterRefs.current[c.id] = el
                }}
                style={i === 0 ? undefined : { opacity: 0, visibility: 'hidden' }}
                className={`absolute inset-x-5 bottom-8 sm:inset-x-8 md:inset-x-12 min-[900px]:bottom-auto min-[900px]:right-auto min-[900px]:top-1/2 min-[900px]:max-w-[31rem] min-[900px]:-translate-y-1/2 ${
                  webgl ? '' : '!relative !inset-auto !mb-16 !translate-y-0 !opacity-100 ![visibility:visible]'
                }`}
              >
                <div className="pointer-events-auto rounded-2xl bg-paper/80 p-5 backdrop-blur-md min-[900px]:bg-transparent min-[900px]:p-0 min-[900px]:backdrop-blur-0">
                  {isHero && (
                    <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.16em] text-steel motion-safe:animate-[fadeUp_900ms_200ms_both]">
                      {t.stage.eyebrow}
                    </p>
                  )}
                  {isHero ? (
                    <RevealText
                      key={copy.title}
                      as="h1"
                      text={copy.title}
                      delay={250}
                      className="font-wide text-balance text-[2.6rem] font-medium leading-[0.98] tracking-[-0.02em] text-ink sm:text-6xl lg:text-7xl"
                    />
                  ) : (
                    <h2 className="font-wide text-balance text-3xl font-medium leading-[1.02] tracking-[-0.015em] text-ink sm:text-4xl lg:text-5xl">
                      {copy.title}
                    </h2>
                  )}
                  <p
                    className={`mt-4 max-w-[26rem] text-base leading-relaxed text-graphite sm:text-lg ${
                      isHero ? 'motion-safe:animate-[fadeUp_900ms_650ms_both]' : ''
                    }`}
                  >
                    {copy.body}
                  </p>
                  {(isHero || isLast) && (
                    <div className={`mt-7 flex flex-wrap gap-3 ${isHero ? 'motion-safe:animate-[fadeUp_900ms_800ms_both]' : ''}`}>
                      {isHero ? (
                        <button type="button" onClick={() => jumpTo('platform')} className={primary}>
                          {t.stage.explore}
                          {arrow}
                        </button>
                      ) : (
                        <a href="#support" className={primary}>
                          {t.nav.support}
                          {arrow}
                        </a>
                      )}
                      <a href={isHero ? '#support' : '#contact'} className={secondary}>
                        {isHero ? t.nav.support : t.nav.contact}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Chapter rail, desktop only. */}
        {webgl && (
          <nav
            aria-label={t.stage.railAria}
            className="absolute right-8 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-3 min-[900px]:flex md:right-12"
          >
            {RAIL.map((id) => (
              <button
                key={id}
                type="button"
                ref={(el) => {
                  railRefs.current[id] = el
                }}
                onClick={() => jumpTo(id)}
                data-active="false"
                className="group flex items-center gap-3 font-mono text-[11px] text-steel/70 transition-colors duration-300 hover:text-ink data-[active=true]:text-ink"
              >
                {t.stage.rail[id]}
                <span className="h-px w-5 bg-current transition-all duration-300 group-data-[active=true]:w-9 group-data-[active=true]:bg-accent" />
              </button>
            ))}
          </nav>
        )}
      </div>
    </section>
  )
}
