import { useEffect, useState } from 'react'

export type Route =
  | { name: 'clients' }
  | { name: 'client'; id: string }
  | { name: 'plan'; id: string }
  | { name: 'diet'; id: string }
  | { name: 'print-plan'; id: string }
  | { name: 'print-diet'; id: string }
  | { name: 'library' }
  | { name: 'backup' }

const segments = {
  client: 'podopieczny',
  plan: 'plan',
  diet: 'dieta',
  'print-plan': 'druk-plan',
  'print-diet': 'druk-dieta',
  library: 'biblioteka',
  backup: 'kopia',
} as const

export function href(route: Route): string {
  if (route.name === 'clients') return '#/'
  const seg = segments[route.name]
  return 'id' in route ? `#/${seg}/${route.id}` : `#/${seg}`
}

function parse(hash: string): Route {
  const [seg, id] = hash.replace(/^#\/?/, '').split('/')
  const name = (Object.keys(segments) as (keyof typeof segments)[]).find((k) => segments[k] === seg)
  if (!name) return { name: 'clients' }
  if (name === 'library' || name === 'backup') return { name }
  return id ? { name, id } : { name: 'clients' }
}

export function navigate(route: Route) {
  window.location.hash = href(route)
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(parse(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
