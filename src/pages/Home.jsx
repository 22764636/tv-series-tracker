import { useMemo, useState } from 'react'
import { useVault } from '../store/VaultContext'
import SeriesCard from '../components/SeriesCard'
import StatusTabs from '../components/StatusTabs'
import EmptyState from '../components/EmptyState'
import { progressRatio } from '../lib/progress'

const SORT_OPTIONS = [
  { key: 'updated', label: 'Ultimo aggiornamento' },
  { key: 'title', label: 'Titolo (A-Z)' },
  { key: 'rating', label: 'Valutazione' },
  { key: 'progress', label: 'Progresso' },
]

function sortSeries(list, sortKey) {
  const sorted = [...list]
  switch (sortKey) {
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'rating':
      return sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
    case 'progress':
      return sorted.sort((a, b) => progressRatio(b) - progressRatio(a))
    case 'updated':
    default:
      return sorted // already ordered by updatedAt desc from VaultContext
  }
}

export default function Home() {
  const { series } = useVault()
  const [tab, setTab] = useState('all')
  const [sortKey, setSortKey] = useState('updated')

  const filtered = useMemo(() => {
    const base = tab === 'all' ? series : series.filter((s) => s.status === tab)
    return sortSeries(base, sortKey)
  }, [series, tab, sortKey])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusTabs active={tab} onChange={setTab} />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

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
