import { useEffect, useRef, useState } from 'react'
import Logo from './Logo'
import type { Route } from '../lib/route'
import { useLang } from '../i18n'
import type { Lang } from '../i18n/dict'

function LangSwitch({ className = '', dark = false }: { className?: string; dark?: boolean }) {
  const { lang, setLang, t } = useLang()
  return (
    <div
      role="group"
      aria-label={t.nav.language}
      className={`relative flex rounded-full p-0.5 font-mono text-[11px] ring-1 ring-inset ${dark ? 'ring-paper/20' : 'ring-ink/15'} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full transition-transform duration-500 ease-out-expo ${dark ? 'bg-paper' : 'bg-ink'}`}
        style={{ transform: lang === 'it' ? 'translateX(100%)' : 'none' }}
      />
      {(['en', 'it'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`relative z-10 w-9 py-1.5 uppercase transition-colors duration-300 ${
            lang === l ? (dark ? 'text-ink' : 'text-paper') : dark ? 'text-paper/60 hover:text-paper' : 'text-graphite hover:text-ink'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

/** Floating island navigation, with a full-screen menu below xl. */
export default function Navbar({ route }: { route: Route }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const bar = useRef<HTMLDivElement>(null)

  const links = [
    { label: t.nav.technology, href: '#technology' },
    { label: t.nav.design, href: '#design' },
    { label: t.nav.refuel, href: '#refuel' },
    { label: t.nav.savings, href: '#savings' },
    { label: t.nav.mission, href: '#mission' },
    { label: t.nav.team, href: '#team' },
    { label: t.nav.faq, href: '#faq' },
    { label: t.nav.contact, href: '#contact' },
  ]

  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener('hashchange', close)
    let raf = 0
    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('hashchange', close)
      cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }, [open])

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4 motion-safe:animate-[fadeUp_900ms_both]">
        <nav className="pointer-events-auto relative mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-4 overflow-hidden rounded-full bg-paper/70 pl-5 pr-2 shadow-[0_10px_40px_-18px_rgba(18,18,19,0.35)] ring-1 ring-ink/[0.07] backdrop-blur-xl sm:pl-6">
          <a href="#top" aria-label={t.nav.home} className="flex shrink-0 items-center">
            <Logo />
          </a>

          <ul className="hidden items-center gap-1 xl:flex">
            {links.map((link) => {
              const current = link.href === `#${route}`
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={current ? 'page' : undefined}
                    className={`rounded-full px-3.5 py-2 text-[13px] transition-colors duration-300 ${
                      current ? 'bg-ink/[0.06] text-ink' : 'text-graphite hover:bg-ink/[0.04] hover:text-ink'
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center gap-2">
            <LangSwitch className="hidden sm:flex" />
            <a
              href="#support"
              className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-medium text-paper transition-colors duration-300 hover:bg-graphite active:scale-[0.98]"
            >
              {t.nav.support}
            </a>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
              className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-ink/5 xl:hidden"
            >
              <span
                aria-hidden="true"
                className={`absolute h-px w-5 bg-ink transition-transform duration-500 ease-out-expo ${open ? 'rotate-45' : '-translate-y-[4px]'}`}
              />
              <span
                aria-hidden="true"
                className={`absolute h-px w-5 bg-ink transition-transform duration-500 ease-out-expo ${open ? '-rotate-45' : 'translate-y-[4px]'}`}
              />
            </button>
          </div>
          <div ref={bar} aria-hidden="true" className="absolute inset-x-6 bottom-0 h-px origin-left bg-glow" style={{ transform: 'scaleX(0)' }} />
        </nav>
      </header>

      {/* Full-screen menu below xl. */}
      <div
        id="site-menu"
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-paper/90 backdrop-blur-2xl transition-opacity duration-500 ease-out-expo xl:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="flex h-full flex-col justify-between px-6 pb-10 pt-28 sm:px-10">
          <ul className="flex flex-col gap-1">
            {links.map((link, i) => (
              <li key={link.href} className="overflow-hidden">
                <a
                  href={link.href}
                  tabIndex={open ? 0 : -1}
                  className={`block py-1.5 font-wide text-[clamp(2rem,8vw,3.5rem)] font-medium leading-tight tracking-[-0.02em] text-ink transition-transform duration-700 ease-out-expo ${
                    open ? 'translate-y-0' : 'translate-y-full'
                  }`}
                  style={{ transitionDelay: open ? `${80 + i * 45}ms` : '0ms' }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <LangSwitch className="w-fit" />
        </div>
      </div>
    </>
  )
}
