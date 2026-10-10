import { useState } from 'react'

/** Team photo with a neutral monogram until the real photo is in /public/team. */
export default function Portrait({ src, alt, initials, soon }: { src: string; alt: string; initials: string; soon: string }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <div role="img" aria-label={`${alt} (${soon})`} className="flex h-full w-full items-center justify-center bg-mist">
        <span className="font-wide text-6xl font-medium tracking-[-0.02em] text-steel/50">{initials}</span>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
      onError={() => setFailed(true)}
    />
  )
}
