import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DICTS, type Dict, type Lang } from './dict'

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Dict }

const LangContext = createContext<Ctx | null>(null)
const KEY = 'veylar-lang'

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'it') return saved
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('it') ? 'it' : 'en'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial)

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = DICTS[lang].meta.title
  }, [lang])

  const value = useMemo<Ctx>(
    () => ({
      lang,
      t: DICTS[lang],
      setLang: (l) => {
        setLangState(l)
        try {
          localStorage.setItem(KEY, l)
        } catch {
          /* storage unavailable */
        }
      },
    }),
    [lang],
  )

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang outside LangProvider')
  return ctx
}

/** Locale-aware number and currency helpers for the current language. */
export function useFormat() {
  const { lang } = useLang()
  const locale = lang === 'it' ? 'it-IT' : 'en-IE'
  return useMemo(
    () => ({
      num: (n: number, digits = 0) =>
        new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n),
      eur: (n: number, digits = 0) =>
        new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }).format(n),
    }),
    [locale],
  )
}

/** Replaces {key} placeholders. */
export const fill = (s: string, values: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '')
