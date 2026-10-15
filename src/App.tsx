import { href, useRoute, type Route } from './router'
import { Backup } from './views/Backup'
import { ClientDetail } from './views/ClientDetail'
import { ClientsView } from './views/ClientsView'
import { DietEditor } from './views/DietEditor'
import { Library } from './views/Library'
import { PlanEditor } from './views/PlanEditor'
import { PrintDiet } from './views/PrintDiet'
import { PrintPlan } from './views/PrintPlan'

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'clients':
      return <ClientsView />
    case 'client':
      return <ClientDetail id={route.id} />
    case 'plan':
      return <PlanEditor id={route.id} />
    case 'diet':
      return <DietEditor id={route.id} />
    case 'print-plan':
      return <PrintPlan id={route.id} />
    case 'print-diet':
      return <PrintDiet id={route.id} />
    case 'library':
      return <Library />
    case 'backup':
      return <Backup />
  }
}

export default function App() {
  const route = useRoute()
  const section = route.name === 'library' ? 'library' : route.name === 'backup' ? 'backup' : 'clients'

  return (
    <>
      <header className="topbar no-print">
        <a className="logo" href={href({ name: 'clients' })}>
          💪 Plany&nbsp;i&nbsp;Diety
        </a>
        <nav>
          <a className={section === 'clients' ? 'active' : ''} href={href({ name: 'clients' })}>
            Podopieczni
          </a>
          <a className={section === 'library' ? 'active' : ''} href={href({ name: 'library' })}>
            Biblioteka
          </a>
          <a className={section === 'backup' ? 'active' : ''} href={href({ name: 'backup' })}>
            Kopia zapasowa
          </a>
        </nav>
      </header>
      <main>
        <Page route={route} />
      </main>
    </>
  )
}
