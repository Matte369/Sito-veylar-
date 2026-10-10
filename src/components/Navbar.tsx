import Reveal from './Reveal'
import Logo from './Logo'
import { mailto } from '../config'

type NavLink = { label: string; href: string; sup?: string }

const links: NavLink[] = [
  { label: 'Vehicles', href: mailto('VEYLAR Vehicles — Information Request'), sup: '01' },
  { label: 'Technology', href: '#technology' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: mailto('Contact VEYLAR') },
]

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/15">
      <nav className="flex items-center justify-between px-5 py-4 sm:px-8 md:px-12">
        <Reveal delay={0}>
          <a href="#about" aria-label="VEYLAR — home" className="flex items-center">
            <Logo />
          </a>
        </Reveal>

        <ul className="hidden items-center gap-8 md:flex lg:gap-10">
          {links.map((link, i) => (
            <Reveal as="li" key={link.label} delay={100 + i * 100}>
              <a href={link.href} className="text-sm text-white/85 transition-colors duration-300 hover:text-white">
                {link.label}
                {link.sup && <sup className="ml-0.5 text-[9px]">{link.sup}</sup>}
              </a>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={500}>
          <a
            href="#technology"
            className="inline-block rounded-md border border-white/20 bg-white/15 px-4 py-2 text-xs backdrop-blur-md transition-colors duration-300 hover:bg-white/25 sm:px-5 sm:text-sm"
          >
            Discover VEYLAR
          </a>
        </Reveal>
      </nav>
    </header>
  )
}
