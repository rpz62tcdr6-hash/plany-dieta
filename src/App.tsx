import { href, useRoute, type Route } from './router'
import { Backup } from './views/Backup'
import { ClientDetail } from './views/ClientDetail'
import { ClientsView } from './views/ClientsView'
import { DietEditor } from './views/DietEditor'
import { DietGenerator } from './views/DietGenerator'
import { Library } from './views/Library'
import { PlanEditor } from './views/PlanEditor'
import { PlanGenerator } from './views/PlanGenerator'
import { PrintDiet } from './views/PrintDiet'
import { PrintPlan } from './views/PrintPlan'
import { RecipeEditor } from './views/RecipeEditor'
import { Recipes } from './views/Recipes'

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'clients':
      return <ClientsView />
    case 'client':
      return <ClientDetail id={route.id} />
    case 'plan':
      return <PlanEditor id={route.id} />
    case 'plan-new':
      return <PlanGenerator clientId={route.id} />
    case 'diet':
      return <DietEditor id={route.id} />
    case 'diet-new':
      return <DietGenerator clientId={route.id} />
    case 'print-plan':
      return <PrintPlan id={route.id} />
    case 'print-diet':
      return <PrintDiet id={route.id} />
    case 'recipes':
      return <Recipes />
    case 'recipe':
      return <RecipeEditor id={route.id} />
    case 'library':
      return <Library />
    case 'backup':
      return <Backup />
  }
}

const NAV = [
  { section: 'clients', label: 'Podopieczni', route: { name: 'clients' } },
  { section: 'recipes', label: 'Przepisy', route: { name: 'recipes' } },
  { section: 'library', label: 'Biblioteka', route: { name: 'library' } },
  { section: 'backup', label: 'Ustawienia', route: { name: 'backup' } },
] as const

function sectionOf(route: Route): string {
  if (route.name === 'recipes' || route.name === 'recipe') return 'recipes'
  if (route.name === 'library' || route.name === 'backup') return route.name
  return 'clients'
}

export default function App() {
  const route = useRoute()
  const section = sectionOf(route)

  return (
    <>
      <header className="topbar no-print">
        <a className="logo" href={href({ name: 'clients' })}>
          PLANY<span>&</span>DIETY
        </a>
        <nav>
          {NAV.map((n) => (
            <a key={n.section} className={section === n.section ? 'active' : ''} href={href(n.route)}>
              {n.label}
            </a>
          ))}
        </nav>
      </header>
      <main>
        <Page route={route} />
      </main>
    </>
  )
}
