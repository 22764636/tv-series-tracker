import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useVault } from '../store/VaultContext'
import SeriesCard from '../components/SeriesCard'
import PillTabs from '../components/PillTabs'
import EmptyState from '../components/EmptyState'
import ProgressBar from '../components/ProgressBar'
import StatusBadge from '../components/StatusBadge'
import { averageRating, nextEpisode, progressRatio, totalEpisodes, watchedCount } from '../lib/progress'
import { upcomingCalendarEntries, dateKey } from '../lib/schedule'

const SORT_OPTIONS = [
  { key: 'updated', label: 'Ultimo aggiornamento' },
  { key: 'title', label: 'Titolo (A-Z)' },
  { key: 'rating', label: 'Valutazione' },
  { key: 'progress', label: 'Progresso' },
]
const SORT_KEYS = SORT_OPTIONS.map((o) => o.key)
// Kept in sync with PillTabs.jsx's own STATUS_TABS keys.
const STATUS_KEYS = ['all', 'watching', 'planned', 'completed', 'renewed', 'dropped']
// Strict "mine" filter: a series only shows under 💙/💜 if it's marked solo
// for that heart (series.viewer) — shared series don't show up under either,
// only under "Tutte". 💙/💜 reuse the same two emoji used everywhere else
// for the two people (ViewerPicker, HeartRating), never a new one.
const VIEWER_TABS = [
  { key: 'all', label: 'Tutte' },
  { key: 'blue', label: '💙' },
  { key: 'purple', label: '💜' },
]
const VIEWER_KEYS = VIEWER_TABS.map((o) => o.key)

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
  const rawViewer = searchParams.get('viewer') ?? 'all'
  const viewerFilter = VIEWER_KEYS.includes(rawViewer) ? rawViewer : 'all'

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

  function setViewerFilter(next) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (next === 'all') params.delete('viewer')
      else params.set('viewer', next)
      return params
    })
  }

  const filtered = useMemo(() => {
    const byStatus = tab === 'all' ? series : series.filter((s) => s.status === tab)
    const byViewer =
      viewerFilter === 'all' ? byStatus : byStatus.filter((s) => s.viewer === viewerFilter)
    return sortSeries(byViewer, sortKey)
  }, [series, tab, viewerFilter, sortKey])

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
          <div className="flex flex-col gap-2">
            {todaySeries.map((s) => (
              <TodayListItem key={s.id} series={s} />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <PillTabs active={tab} onChange={setTab} />
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

      <div className="mt-3">
        <PillTabs active={viewerFilter} onChange={setViewerFilter} tabs={VIEWER_TABS} />
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

// Compact list row for "Da vedere oggi" — a small thumbnail instead of the
// full poster, with everything the grid's SeriesCard shows (status, external
// link, progress, episode count, quick-mark action) re-flowed across two
// lines instead of dropped, since this list sits above a whole page of
// cards and shouldn't visually compete with it the same way a second card
// grid would.
function TodayListItem({ series }) {
  const { toggleEpisode } = useVault()
  const next = nextEpisode(series)
  const total = totalEpisodes(series)

  function markNextWatched(e) {
    e.preventDefault()
    e.stopPropagation()
    if (next) toggleEpisode(series.id, next.season, next.episode, true)
  }

  return (
    <Link
      to={`/serie/${series.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-hover"
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-hover">
        {series.posterPath ? (
          <img src={series.posterPath} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted">
            {series.title.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-text">{series.title}</span>
          <div className="flex shrink-0 items-center gap-2">
            {series.link && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  window.open(series.link, '_blank', 'noopener,noreferrer')
                }}
                aria-label="Link esterno"
                className="text-muted hover:text-accent"
              >
                🔗
              </button>
            )}
            <StatusBadge status={series.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProgressBar ratio={progressRatio(series)} className="flex-1" />
          <span className="shrink-0 text-xs text-muted">
            {watchedCount(series)}/{total}
          </span>
          {next && series.status !== 'dropped' && (
            <button
              onClick={markNextWatched}
              className="shrink-0 rounded-full bg-accent-solid px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-solid-hover"
            >
              Segna S{next.season}E{next.episode}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
