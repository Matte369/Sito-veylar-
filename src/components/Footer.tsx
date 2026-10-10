import Logo from './Logo'
import { CONTACT_EMAIL } from '../config'

const groups = [
  {
    title: 'Platform',
    links: [
      { label: 'Technology', href: '#technology' },
      { label: 'Figures', href: '#figures' },
      { label: 'Savings', href: '#savings' },
      { label: 'Roadmap', href: '#roadmap' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Mission', href: '#mission' },
      { label: 'Team', href: '#team' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Get involved',
    links: [
      { label: 'Support us', href: '#support' },
      { label: 'Contact', href: '#contact' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-16 sm:px-8 md:grid-cols-[5fr_7fr] md:px-12">
        <div>
          <Logo />
          <p className="mt-4 font-wide text-2xl font-medium text-ink">Energia, ripensata.</p>
          <p className="mt-4 font-mono text-sm text-ink">{CONTACT_EMAIL}</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="text-sm font-medium text-ink">{g.title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {g.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-graphite transition-colors duration-300 hover:text-ink">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 border-t border-ink/10 px-5 py-6 text-xs text-steel sm:px-8 md:flex-row md:justify-between md:px-12">
        <p>© 2026 VEYLAR. Made in Italy.</p>
        <p>The car shown is an illustrative 3D concept. Specifications are in development.</p>
      </div>
    </footer>
  )
}
