import { useMemo, useState } from 'react'
import { useVault } from '../store/VaultContext'
import SeriesCard from '../components/SeriesCard'
import StatusTabs from '../components/StatusTabs'
import EmptyState from '../components/EmptyState'

export default function Home() {
  const { series } = useVault()
  const [tab, setTab] = useState('all')

  const filtered = useMemo(
    () => (tab === 'all' ? series : series.filter((s) => s.status === tab)),
    [series, tab],
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <StatusTabs active={tab} onChange={setTab} />

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={series.length === 0 ? 'Nessuna serie ancora' : 'Nessuna serie in questa categoria'}
            hint={
              series.length === 0
                ? 'Aggiungine una con il pulsante in alto.'
                : 'Cambia filtro o aggiungi una nuova serie.'
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((s) => (
            <SeriesCard key={s.id} series={s} />
          ))}
        </div>
      )}
    </div>
  )
}
