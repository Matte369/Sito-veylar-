import { useEffect, useState } from 'react'

export type Route = 'home' | 'support' | 'contact'

const PAGES: Route[] = ['support', 'contact']

function read(): Route {
  const h = window.location.hash.replace('#', '')
  return (PAGES as string[]).includes(h) ? (h as Route) : 'home'
}

/**
 * Tiny hash router: #support and #contact are dedicated pages,
 * every other hash is a section anchor on the home page.
 */
export function useRoute() {
  const [route, setRoute] = useState<Route>(read)

  useEffect(() => {
    const onChange = () => {
      const next = read()
      setRoute(next)
      if (next !== 'home') {
        window.scrollTo({ top: 0 })
        return
      }
      // Coming back from a page to a home section: wait for the home view to mount.
      const id = window.location.hash.replace('#', '')
      requestAnimationFrame(() => {
        const el = id ? document.getElementById(id) : null
        if (el) el.scrollIntoView()
        else if (!id || id === 'top') window.scrollTo({ top: 0 })
      })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
