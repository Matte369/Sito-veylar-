import { useId, useState, type FormEvent } from 'react'
import { ArrowRight, Check, Copy } from 'lucide-react'
import Reveal from '../components/Reveal'
import { CONTACT_EMAIL, FORM_ENDPOINT } from '../config'

const TOPICS = ['General enquiry', 'Investment', 'Partnership', 'Press', 'Join the team']

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }
type Errors = Partial<Record<'name' | 'email' | 'message' | 'consent', string>>

const inputClass =
  'w-full rounded-xl border border-ink/20 bg-paper px-4 py-3 text-ink outline-none transition-colors duration-200 placeholder:text-steel/80 focus:border-ink aria-[invalid=true]:border-accent'

export default function ContactPage() {
  const id = useId()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [errors, setErrors] = useState<Errors>({})
  const [sentTo, setSentTo] = useState('')
  const [copied, setCopied] = useState(false)

  const validate = (data: FormData) => {
    const e: Errors = {}
    if (!String(data.get('name') ?? '').trim()) e.name = 'Enter your name.'
    const email = String(data.get('email') ?? '').trim()
    if (!email) e.email = 'Enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter an email address like name@example.com.'
    if (String(data.get('message') ?? '').trim().length < 10) e.message = 'Write a message of at least 10 characters.'
    if (!data.get('consent')) e.consent = 'Tick the box so we can use your details to reply.'
    return e
  }

  const onSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    const form = ev.currentTarget
    const data = new FormData(form)
    const e = validate(data)
    setErrors(e)
    if (Object.keys(e).length) {
      const first = form.querySelector<HTMLElement>('[aria-invalid="true"]')
      first?.focus()
      return
    }
    setStatus({ kind: 'sending' })
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          topic: data.get('topic'),
          message: data.get('message'),
          _subject: `VEYLAR website: ${data.get('topic')}`,
          _replyto: data.get('email'),
          _template: 'table',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || String(json.success) !== 'true') throw new Error(json.message || `Error ${res.status}`)
      setSentTo(String(data.get('email')))
      setStatus({ kind: 'sent' })
      form.reset()
    } catch {
      setStatus({
        kind: 'error',
        message: `Your message could not be sent. Check your connection and try again, or write to us directly at ${CONTACT_EMAIL}.`,
      })
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.getElementById(`${id}-addr`)
      if (el) window.getSelection()?.selectAllChildren(el)
    }
  }

  const field = (name: keyof Errors) => ({
    id: `${id}-${name}`,
    name,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${id}-${name}-err` : undefined,
  })
  const error = (name: keyof Errors) =>
    errors[name] ? (
      <p id={`${id}-${name}-err`} className="text-sm text-[#b23d0f]">
        {errors[name]}
      </p>
    ) : null

  return (
    <div className="pt-16">
      <section className="mx-auto grid max-w-[1440px] gap-16 px-5 py-16 sm:px-8 md:px-12 lg:grid-cols-[5fr_7fr] lg:py-24">
        <Reveal>
          <h1 className="font-wide text-balance text-5xl font-medium leading-[0.98] tracking-[-0.02em] text-ink sm:text-6xl">
            Contact us.
          </h1>
          <p className="mt-6 max-w-[28rem] text-lg leading-relaxed text-graphite">
            Questions about the project, investment or partnerships? Send us a message and we will reply by email.
          </p>
          <div className="mt-10 border-t border-ink/15 pt-6">
            <p className="text-sm text-graphite">Or write to us directly</p>
            <div className="mt-2 flex items-center gap-2">
              <span id={`${id}-addr`} className="select-all font-mono text-ink">
                {CONTACT_EMAIL}
              </span>
              <button
                type="button"
                onClick={copy}
                aria-label={copied ? 'Email address copied' : 'Copy email address'}
                className="flex h-9 w-9 items-center justify-center rounded-full text-graphite hover:bg-ink/5 hover:text-ink"
              >
                {copied ? <Check size={16} strokeWidth={1.75} /> : <Copy size={16} strokeWidth={1.75} />}
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          {status.kind === 'sent' ? (
            <div className="rounded-3xl bg-paper p-8 sm:p-12" role="status">
              <Check size={28} strokeWidth={1.75} className="text-accent" />
              <h2 className="mt-6 font-wide text-3xl font-medium text-ink">Message sent.</h2>
              <p className="mt-3 max-w-[28rem] leading-relaxed text-graphite">
                Thank you. We will reply to {sentTo} as soon as we can.
              </p>
              <button
                type="button"
                onClick={() => setStatus({ kind: 'idle' })}
                className="mt-8 rounded-full border border-ink/20 px-6 py-3 text-sm font-medium text-ink hover:bg-ink/5"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} className="grid gap-6 rounded-3xl bg-paper p-6 sm:p-10">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor={`${id}-name`} className="text-sm font-medium text-ink">
                    Name
                  </label>
                  <input {...field('name')} autoComplete="name" className={inputClass} />
                  {error('name')}
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor={`${id}-email`} className="text-sm font-medium text-ink">
                    Email
                  </label>
                  <input {...field('email')} type="email" autoComplete="email" className={inputClass} />
                  {error('email')}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-topic`} className="text-sm font-medium text-ink">
                  Topic
                </label>
                <select id={`${id}-topic`} name="topic" className={inputClass} defaultValue={TOPICS[0]}>
                  {TOPICS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor={`${id}-message`} className="text-sm font-medium text-ink">
                  Message
                </label>
                <textarea {...field('message')} rows={6} className={`${inputClass} resize-y`} />
                {error('message')}
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-3 text-sm leading-relaxed text-graphite">
                  <input
                    {...field('consent')}
                    type="checkbox"
                    value="yes"
                    className="mt-1 h-4 w-4 shrink-0 accent-ink"
                  />
                  I agree that VEYLAR uses my details only to reply to this message.
                </label>
                {error('consent')}
              </div>

              {status.kind === 'error' && (
                <p role="alert" className="rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-ink">
                  {status.message}
                </p>
              )}

              <button
                type="submit"
                disabled={status.kind === 'sending'}
                className="inline-flex items-center justify-center gap-2 justify-self-start rounded-full bg-ink px-8 py-4 text-base font-medium text-paper transition-colors duration-300 hover:bg-graphite active:scale-[0.98] disabled:cursor-wait disabled:bg-ink/60"
              >
                {status.kind === 'sending' ? 'Sending…' : 'Send message'}
                {status.kind !== 'sending' && <ArrowRight size={18} strokeWidth={1.75} />}
              </button>
            </form>
          )}
        </Reveal>
      </section>
    </div>
  )
}
