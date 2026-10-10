import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import Logo from './Logo'
import type { Route } from '../lib/route'

const links = [
  { label: 'Technology', href: '#technology' },
  { label: 'Figures', href: '#figures' },
  { label: 'Savings', href: '#savings' },
  { label: 'Mission', href: '#mission' },
  { label: 'Team', href: '#team' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar({ route }: { route: Route }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener('hashchange', close)
    return () => window.removeEventListener('hashchange', close)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-ink/10 bg-paper/75 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-5 sm:px-8 md:px-12">
        <a href="#top" aria-label="VEYLAR, home" className="flex shrink-0 items-center">
          <Logo />
        </a>

        <ul className="hidden items-center gap-8 lg:flex">
          {links.map((link) => {
            const current = link.href === `#${route}`
            return (
              <li key={link.label}>
                <a
                  href={link.href}
                  aria-current={current ? 'page' : undefined}
                  className={`text-sm transition-colors duration-300 hover:text-ink ${current ? 'text-ink' : 'text-graphite'}`}
                >
                  {link.label}
                </a>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href="#support"
            className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper transition-colors duration-300 hover:bg-graphite active:scale-[0.98]"
          >
            Support us
          </a>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-ink/5 lg:hidden"
          >
            {open ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
          </button>
        </div>
      </nav>

      {open && (
        <ul id="mobile-menu" className="border-t border-ink/10 bg-paper px-5 py-4 sm:px-8 lg:hidden">
          {links.map((link) => (
            <li key={link.label}>
              <a href={link.href} className="block py-3 font-wide text-2xl font-medium text-ink">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}
