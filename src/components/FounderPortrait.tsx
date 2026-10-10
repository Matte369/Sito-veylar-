import { useState } from 'react'
import { User } from 'lucide-react'
import { FOUNDER_PORTRAIT_URL } from '../config'

const ALT = 'Matteo Carminati, Founder of VEYLAR'

/** Real founder portrait; a neutral placeholder is shown until it is provided. */
export default function FounderPortrait() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div role="img" aria-label={ALT} className="flex h-24 w-20 items-center justify-center rounded-lg bg-white/10">
        <User size={28} className="text-white/40" strokeWidth={1.5} />
      </div>
    )
  }

  return (
    <img
      src={FOUNDER_PORTRAIT_URL}
      alt={ALT}
      className="h-24 w-20 rounded-lg object-cover"
      onError={() => setFailed(true)}
    />
  )
}
