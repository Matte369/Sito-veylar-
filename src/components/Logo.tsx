import { useState } from 'react'
import { LOGO_URL } from '../config'

/**
 * Official VEYLAR logo (metallic silver V symbol + wordmark), served from
 * /public. The raster asset is never redrawn; if it is missing, only the
 * accessible name is shown until the file is added.
 */
export default function Logo() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span className="text-sm font-medium uppercase tracking-[0.15em] text-white/85" role="img" aria-label="VEYLAR">
        VEYLAR
      </span>
    )
  }

  return (
    <img
      src={LOGO_URL}
      alt="VEYLAR"
      className="h-7 w-auto select-none object-contain sm:h-8"
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}
