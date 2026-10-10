import { useState } from 'react'

/** Team photo with a neutral monogram until the real photo is in /public/team. */
export default function Portrait({ src, alt, initials }: { src: string; alt: string; initials: string }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <div role="img" aria-label={`${alt} (photo coming soon)`} className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl bg-mist">
        <span className="font-wide text-6xl font-medium tracking-[-0.02em] text-steel/50">{initials}</span>
      </div>
    )
  }
  return <img src={src} alt={alt} className="aspect-[4/5] w-full rounded-2xl object-cover" onError={() => setFailed(true)} />
}
