import { useEffect, useRef, useState } from 'react'
import { HERO_POSTER_URL, HERO_VIDEO_URL } from '../config'

const MAX_FRAMES = 90
const MIN_FRAMES = 24
const FRAMES_PER_SECOND = 12
const MAX_EXTRACT_WIDTH = 960
const LERP = 0.12
const SEEK_EPSILON = 0.04

function getScrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  if (max <= 0) return 0
  return Math.min(1, Math.max(0, window.scrollY / max))
}

function waitForEvent(target: EventTarget, name: string) {
  return new Promise<void>((resolve, reject) => {
    const onOk = () => {
      cleanup()
      resolve()
    }
    const onErr = () => {
      cleanup()
      reject(new Error(`video error while waiting for ${name}`))
    }
    const cleanup = () => {
      target.removeEventListener(name, onOk)
      target.removeEventListener('error', onErr)
    }
    target.addEventListener(name, onOk, { once: true })
    target.addEventListener('error', onErr, { once: true })
  })
}

/** Draws a source with object-cover scaling and centered cropping. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  cw: number,
  ch: number,
) {
  const scale = Math.max(cw / sw, ch / sh)
  const dw = sw * scale
  const dh = sh * scale
  ctx.drawImage(source, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
}

export default function ScrollVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasFrame, setHasFrame] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    let cancelled = false
    let raf = 0
    let target = getScrollProgress()
    let smoothed = target
    let frames: ImageBitmap[] = []
    let lastDrawn = -1
    const ctx = canvas.getContext('2d')

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(window.innerWidth * dpr)
      canvas.height = Math.round(window.innerHeight * dpr)
      lastDrawn = -1
    }
    resize()

    const onScroll = () => {
      target = getScrollProgress()
    }

    const tick = () => {
      smoothed += (target - smoothed) * LERP

      if (frames.length && ctx) {
        const index = Math.min(frames.length - 1, Math.round(smoothed * (frames.length - 1)))
        if (index !== lastDrawn) {
          const frame = frames[index]
          drawCover(ctx, frame, frame.width, frame.height, canvas.width, canvas.height)
          lastDrawn = index
        }
      } else if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) {
        // Fallback: scrub the visible video directly.
        const time = smoothed * (video.duration - 0.05)
        if (Math.abs(video.currentTime - time) > SEEK_EPSILON && !video.seeking) {
          video.currentTime = time
        }
      }

      raf = requestAnimationFrame(tick)
    }

    // Resolves once the visible video has decoded its first frame.
    const visibleReady = new Promise<void>((resolve) => {
      const onLoadedData = () => {
        if (!cancelled) setHasFrame(true)
        resolve()
      }
      if (video.readyState >= 2) onLoadedData()
      else video.addEventListener('loadeddata', onLoadedData, { once: true })
    })

    // Build a cache of decoded frames from a dedicated (off-DOM) video element.
    const extract = async () => {
      await visibleReady
      await new Promise((r) => setTimeout(r, 300))
      if (cancelled) return

      const source = document.createElement('video')
      source.muted = true
      source.playsInline = true
      source.preload = 'auto'
      source.crossOrigin = 'anonymous'
      source.src = HERO_VIDEO_URL

      try {
        if (source.readyState < 2) await waitForEvent(source, 'loadeddata')
        if (cancelled) return

        const duration = source.duration
        if (!Number.isFinite(duration) || duration <= 0) return
        const count = Math.min(MAX_FRAMES, Math.max(MIN_FRAMES, Math.round(duration * FRAMES_PER_SECOND)))
        const width = Math.min(MAX_EXTRACT_WIDTH, source.videoWidth)
        const height = Math.round((source.videoHeight / source.videoWidth) * width)

        const cache: ImageBitmap[] = []
        for (let i = 0; i < count; i++) {
          if (cancelled) break
          source.currentTime = (i / (count - 1)) * (duration - 0.05)
          await waitForEvent(source, 'seeked')
          cache.push(
            await createImageBitmap(source, {
              resizeWidth: width,
              resizeHeight: height,
              resizeQuality: 'medium',
            }),
          )
        }

        if (cancelled) {
          cache.forEach((b) => b.close())
          return
        }
        frames = cache
        lastDrawn = -1
        setCanvasReady(true)
      } catch {
        // CORS or decoding failure: keep using the seek-based fallback.
      } finally {
        source.removeAttribute('src')
        source.load()
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', resize)
    window.addEventListener('resize', onScroll)
    raf = requestAnimationFrame(tick)
    extract()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resize)
      window.removeEventListener('resize', onScroll)
      frames.forEach((b) => b.close())
      frames = []
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0a0a0a]" aria-hidden="true">
      <img
        src={HERO_POSTER_URL}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          hasFrame || hasFrame && !canvasReady ? 'opacity-100' : 'opacity-0'
        }`}
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
      <video
        ref={videoRef}
        src={HERO_VIDEO_URL}
        muted
        playsInline
        preload="auto"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          canvasReady ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
          canvasReady ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}
