import { useState } from 'react'
import { LOGO_URL } from '../config'

/**
 * Official VEYLAR logo, served from /public. The asset is never redrawn;
 * until the file is added, a plain wordmark holds its place.
 */
export default function Logo() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span className="font-wide text-base font-semibold tracking-[0.22em] text-ink" role="img" aria-label="VEYLAR">
        VEYLAR
      </span>
    )
  }

  return (
    <img
      src={LOGO_URL}
      alt="VEYLAR"
      className="h-7 w-auto select-none object-contain"
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}
