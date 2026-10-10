import Logo from './Logo'
import { mailto } from '../config'

const links = [
  { label: 'Technology', href: '#technology' },
  { label: 'Roadmap', href: '#roadmap' },
  { label: 'Founder', href: '#founder' },
]

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-ink/10 bg-paper/70 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 md:px-12">
        <a href="#top" aria-label="VEYLAR, back to top" className="flex items-center">
          <Logo />
        </a>
        <ul className="hidden items-center gap-10 md:flex">
          {links.map((link) => (
            <li key={link.label}>
              <a href={link.href} className="text-sm text-graphite transition-colors duration-300 hover:text-ink">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href={mailto('VEYLAR enquiry')}
          className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper transition-transform duration-300 hover:bg-graphite active:scale-[0.98]"
        >
          Contact
        </a>
      </nav>
    </header>
  )
}
