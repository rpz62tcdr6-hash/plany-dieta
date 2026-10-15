import { useEffect, useState } from 'react'

export type Route =
  | { name: 'clients' }
  | { name: 'client'; id: string }
  | { name: 'plan'; id: string }
  | { name: 'plan-new'; id: string }
  | { name: 'diet'; id: string }
  | { name: 'diet-new'; id: string }
  | { name: 'print-plan'; id: string }
  | { name: 'print-diet'; id: string }
  | { name: 'recipes' }
  | { name: 'recipe'; id: string }
  | { name: 'library' }
  | { name: 'backup' }

const segments = {
  client: 'podopieczny',
  plan: 'plan',
  'plan-new': 'nowy-plan',
  diet: 'dieta',
  'diet-new': 'nowa-dieta',
  'print-plan': 'druk-plan',
  'print-diet': 'druk-dieta',
  recipes: 'przepisy',
  recipe: 'przepis',
  library: 'biblioteka',
  backup: 'kopia',
} as const

const noId = ['recipes', 'library', 'backup'] as const

export function href(route: Route): string {
  if (route.name === 'clients') return '#/'
  const seg = segments[route.name]
  return 'id' in route ? `#/${seg}/${route.id}` : `#/${seg}`
}

function parse(hash: string): Route {
  const [seg, id] = hash.replace(/^#\/?/, '').split('/')
  const name = (Object.keys(segments) as (keyof typeof segments)[]).find((k) => segments[k] === seg)
  if (!name) return { name: 'clients' }
  if ((noId as readonly string[]).includes(name)) return { name } as Route
  return id ? ({ name, id } as Route) : { name: 'clients' }
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
