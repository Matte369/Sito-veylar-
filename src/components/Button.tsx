import type { ReactNode } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'

type Common = {
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'glow'
  icon?: 'right' | 'out' | null
  className?: string
}

const styles = {
  primary: 'bg-ink text-paper hover:bg-graphite',
  ghost: 'bg-ink/[0.04] text-ink ring-1 ring-inset ring-ink/15 hover:bg-ink/[0.07]',
  glow: 'bg-glow text-ink hover:bg-[#f5b46e]',
}
const iconWrap = {
  primary: 'bg-paper/15',
  ghost: 'bg-ink/[0.06]',
  glow: 'bg-ink/10',
}

function Inner({ children, variant = 'primary', icon = 'right' }: Common) {
  const Icon = icon === 'out' ? ArrowUpRight : ArrowRight
  return (
    <>
      <span className={icon ? 'pl-1' : ''}>{children}</span>
      {icon && (
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-500 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105 ${iconWrap[variant]}`}
        >
          <Icon size={15} strokeWidth={1.5} />
        </span>
      )}
    </>
  )
}

const base =
  'group inline-flex items-center gap-3 whitespace-nowrap rounded-full py-1.5 pl-5 text-sm font-medium transition-[background-color,transform] duration-300 ease-out-expo active:scale-[0.98]'

/** Pill button with its arrow nested in its own circle (button-in-button). */
export function ButtonLink({ href, external, ...rest }: Common & { href: string; external?: boolean }) {
  const v = rest.variant ?? 'primary'
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`${base} ${rest.icon === null ? 'py-3 pr-5' : 'pr-1.5'} ${styles[v]} ${rest.className ?? ''}`}
    >
      <Inner {...rest} />
    </a>
  )
}

export function Button({
  onClick,
  type = 'button',
  disabled,
  ...rest
}: Common & { onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean }) {
  const v = rest.variant ?? 'primary'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${rest.icon === null ? 'py-3 pr-5' : 'pr-1.5'} ${styles[v]} disabled:cursor-not-allowed disabled:opacity-50 ${rest.className ?? ''}`}
    >
      <Inner {...rest} />
    </button>
  )
}
