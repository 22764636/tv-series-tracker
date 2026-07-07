import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useVault } from '../store/VaultContext'
import SeriesCard from '../components/SeriesCard'
import StatusTabs from '../components/StatusTabs'
import EmptyState from '../components/EmptyState'
import { averageRating, progressRatio } from '../lib/progress'
import { upcomingCalendarEntries, dateKey } from '../lib/schedule'

const SORT_OPTIONS = [
  { key: 'updated', label: 'Ultimo aggiornamento' },
  { key: 'title', label: 'Titolo (A-Z)' },
  { key: 'rating', label: 'Valutazione' },
  { key: 'progress', label: 'Progresso' },
]
const SORT_KEYS = SORT_OPTIONS.map((o) => o.key)
// Kept in sync with StatusTabs.jsx's own TABS keys.
const STATUS_KEYS = ['all', 'watching', 'planned', 'completed', 'renewed', 'dropped']

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
  // Status filter and sort order live in the URL (?status=...&sort=...)
  // instead of local state, so a specific view is bookmarkable — a
  // malformed/unknown value in a hand-edited URL just falls back to the
  // default rather than showing an empty/broken list.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('status') ?? 'all'
  const tab = STATUS_KEYS.includes(rawTab) ? rawTab : 'all'
  const rawSort = searchParams.get('sort') ?? 'updated'
  const sortKey = SORT_KEYS.includes(rawSort) ? rawSort : 'updated'

  function setTab(next) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (next === 'all') params.delete('status')
      else params.set('status', next)
      return params
    })
  }

  function setSortKey(next) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (next === 'updated') params.delete('sort')
      else params.set('sort', next)
      return params
    })
  }

  const filtered = useMemo(() => {
    const base = tab === 'all' ? series : series.filter((s) => s.status === tab)
    return sortSeries(base, sortKey)
  }, [series, tab, sortKey])

  // Reuses the same projection Calendario is built on (upcomingCalendarEntries),
  // scoped to just today's date — a series only shows up here if it still has
  // an unwatched episode scheduled for today, same rule as the calendar cell.
  // Always visible regardless of the status filter/sort above: it's a fixed
  // "what's due today" callout, not part of the filtered library grid.
  const todaySeries = useMemo(() => {
    const today = new Date()
    const todayKey = dateKey(today)
    return upcomingCalendarEntries(series, today)
      .filter((entry) => dateKey(entry.date) === todayKey)
      .map((entry) => entry.series)
  }, [series])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {todaySeries.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-text">Da vedere oggi</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {todaySeries.map((s) => (
              <SeriesCard key={s.id} series={s} />
            ))}
          </div>
        </div>
      )}

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
