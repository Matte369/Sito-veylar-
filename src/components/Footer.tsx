import Logo from './Logo'
import { CONTACT_EMAIL } from '../config'
import { useLang } from '../i18n'

export default function Footer() {
  const { t } = useLang()
  const groups = [
    {
      title: t.footer.platform,
      links: [
        { label: t.nav.technology, href: '#technology' },
        { label: t.nav.figures, href: '#figures' },
        { label: t.nav.refuel, href: '#refuel' },
        { label: t.nav.savings, href: '#savings' },
        { label: t.footer.roadmap, href: '#roadmap' },
      ],
    },
    {
      title: t.footer.company,
      links: [
        { label: t.nav.mission, href: '#mission' },
        { label: t.nav.team, href: '#team' },
        { label: t.nav.faq, href: '#faq' },
      ],
    },
    {
      title: t.footer.involved,
      links: [
        { label: t.nav.support, href: '#support' },
        { label: t.nav.contact, href: '#contact' },
      ],
    },
  ]
  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-16 sm:px-8 md:grid-cols-[5fr_7fr] md:px-12">
        <div>
          <Logo />
          <p className="mt-4 font-wide text-2xl font-medium text-ink">{t.footer.tagline}</p>
          <p className="mt-4 font-mono text-sm text-ink">{CONTACT_EMAIL}</p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="text-sm font-medium text-ink">{g.title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {g.links.map((l) => (
                  <li key={l.href}>
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
        <p>{t.footer.rights}</p>
        <p>{t.footer.disclaimer}</p>
      </div>
    </footer>
  )
}
