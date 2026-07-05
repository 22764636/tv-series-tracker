import { useMemo, useState } from 'react'
import { useVault } from '../store/VaultContext'
import SeriesCard from '../components/SeriesCard'
import StatusTabs from '../components/StatusTabs'
import EmptyState from '../components/EmptyState'
import { averageRating, progressRatio } from '../lib/progress'

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
    case 'rating': {
      // Unrated series (averageRating() null) always sort after every rated
      // one, never interleaved — -Infinity guarantees that regardless of
      // the 1-10 scale rated series use.
      const ratingOf = (s) => averageRating(s) ?? -Infinity
      return sorted.sort((a, b) => ratingOf(b) - ratingOf(a))
    }
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
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <StatusTabs active={tab} onChange={setTab} />
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="shrink-0 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
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
