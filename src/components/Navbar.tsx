import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import Logo from './Logo'
import type { Route } from '../lib/route'
import { useLang } from '../i18n'
import type { Lang } from '../i18n/dict'

function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useLang()
  return (
    <div role="group" aria-label={t.nav.language} className={`relative flex rounded-full border border-ink/15 p-0.5 font-mono text-[11px] ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-ink transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: lang === 'it' ? 'translateX(100%)' : 'none' }}
      />
      {(['en', 'it'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`relative z-10 w-9 py-1.5 uppercase transition-colors duration-300 ${lang === l ? 'text-paper' : 'text-graphite hover:text-ink'}`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

export default function Navbar({ route }: { route: Route }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const bar = useRef<HTMLDivElement>(null)

  const links = [
    { label: t.nav.technology, href: '#technology' },
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
    // Reading progress: a thin accent line under the bar.
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

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-ink/10 bg-paper/75 backdrop-blur-md motion-safe:animate-[fadeUp_800ms_both]">
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 md:px-12">
        <a href="#top" aria-label={t.nav.home} className="flex shrink-0 items-center">
          <Logo />
        </a>

        <ul className="hidden items-center gap-7 xl:flex">
          {links.map((link) => {
            const current = link.href === `#${route}`
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={current ? 'page' : undefined}
                  className={`group relative text-sm transition-colors duration-300 hover:text-ink ${current ? 'text-ink' : 'text-graphite'}`}
                >
                  {link.label}
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-1 left-0 h-px w-full origin-left bg-ink transition-transform duration-300 ${current ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}
                  />
                </a>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-3">
          <LangSwitch className="hidden sm:flex" />
          <a
            href="#support"
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper transition-colors duration-300 hover:bg-accent active:scale-[0.98]"
          >
            {t.nav.support}
          </a>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-ink/5 xl:hidden"
          >
            {open ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
          </button>
        </div>
      </nav>
      <div ref={bar} aria-hidden="true" className="absolute inset-x-0 -bottom-px h-[2px] origin-left bg-accent" style={{ transform: 'scaleX(0)' }} />

      {open && (
        <div id="mobile-menu" className="border-t border-ink/10 bg-paper px-5 py-4 sm:px-8 xl:hidden">
          <ul>
            {links.map((link, i) => (
              <li key={link.href} className="motion-safe:animate-[fadeUp_500ms_both]" style={{ animationDelay: `${i * 40}ms` }}>
                <a href={link.href} className="block py-3 font-wide text-2xl font-medium text-ink">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <LangSwitch className="mt-4 w-fit sm:hidden" />
        </div>
      )}
    </header>
  )
}
