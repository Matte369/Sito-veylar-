import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import Reveal from './Reveal'
import { CONTACT_EMAIL, FOUNDER_PORTRAIT_URL, mailto } from '../config'

function Portrait() {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div
        role="img"
        aria-label="Portrait of Matteo Carminati, founder of VEYLAR (photo coming soon)"
        className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl bg-mist"
      >
        <span className="font-wide text-7xl font-medium tracking-[-0.02em] text-steel/50">MC</span>
      </div>
    )
  }
  return (
    <img
      src={FOUNDER_PORTRAIT_URL}
      alt="Matteo Carminati, Founder of VEYLAR"
      className="aspect-[4/5] w-full rounded-2xl object-cover"
      onError={() => setFailed(true)}
    />
  )
}

export default function Founder() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const range = document.createRange()
      const el = document.getElementById('contact-email')
      if (el) {
        range.selectNodeContents(el)
        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
      }
    }
  }

  return (
    <section id="founder" className="scroll-mt-16 border-t border-ink/10 bg-paper">
      <div className="mx-auto grid max-w-[1440px] items-end gap-12 px-5 py-28 sm:px-8 md:grid-cols-[5fr_7fr] md:gap-20 md:px-12 md:py-36">
        <Reveal className="max-w-md">
          <Portrait />
        </Reveal>

        <Reveal delay={120}>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-steel">Founder</p>
          <h2 className="mt-4 font-wide text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-ink sm:text-5xl lg:text-6xl">
            Matteo Carminati
          </h2>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-graphite">
            Matteo founded VEYLAR to build an electric car that produces the energy it needs on board. If you
            want to know more about the project, write to us.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href={mailto('VEYLAR enquiry')}
              className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors duration-300 hover:bg-graphite active:scale-[0.98]"
            >
              Contact
            </a>
            <div className="flex items-center gap-1 rounded-full border border-ink/15 py-1 pl-5 pr-1">
              <span id="contact-email" className="select-all font-mono text-sm text-ink">
                {CONTACT_EMAIL}
              </span>
              <button
                type="button"
                onClick={copy}
                aria-label={copied ? 'Email address copied' : 'Copy email address'}
                className="flex h-9 w-9 items-center justify-center rounded-full text-graphite transition-colors duration-300 hover:bg-ink/5 hover:text-ink"
              >
                {copied ? <Check size={16} strokeWidth={1.75} /> : <Copy size={16} strokeWidth={1.75} />}
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
