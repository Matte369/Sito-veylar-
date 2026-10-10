import Logo from './Logo'
import { CONTACT_EMAIL, mailto } from '../config'

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-5 py-14 sm:px-8 md:flex-row md:items-end md:justify-between md:px-12">
        <div>
          <Logo />
          <p className="mt-4 font-wide text-2xl font-medium text-ink">Energia, ripensata.</p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-graphite md:items-end">
          <a href={mailto('VEYLAR enquiry')} className="font-mono text-ink hover:text-accent">
            {CONTACT_EMAIL}
          </a>
          <p>© 2026 VEYLAR. Made in Italy.</p>
          <p className="max-w-sm text-steel md:text-right">
            The car shown is an illustrative 3D concept. Specifications are in development.
          </p>
        </div>
      </div>
    </footer>
  )
}
