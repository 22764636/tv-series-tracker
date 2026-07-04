import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useVault } from '../store/VaultContext'
import { upcomingCalendarEntries } from '../lib/schedule'
import EmptyState from '../components/EmptyState'

function formatDayHeader(date) {
  const label = date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function dateKey(date) {
  return date.toISOString().slice(0, 10)
}

export default function Calendar() {
  const { series } = useVault()

  const groups = useMemo(() => {
    const entries = upcomingCalendarEntries(series)
    const byDate = new Map()
    for (const entry of entries) {
      const key = dateKey(entry.date)
      if (!byDate.has(key)) byDate.set(key, { date: entry.date, items: [] })
      byDate.get(key).items.push(entry)
    }
    return Array.from(byDate.values())
  }, [series])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-text sm:text-2xl">Calendario</h1>

      {groups.length === 0 ? (
        <EmptyState
          title="Nessuna serie pianificata"
          hint="Imposta i giorni di visione in una scheda serie per vederla comparire qui."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(({ date, items }) => (
            <div key={dateKey(date)}>
              <h2 className="mb-2 text-sm font-semibold text-text">{formatDayHeader(date)}</h2>
              <div className="flex flex-col gap-1.5">
                {items.map(({ series: s, episode }) => (
                  <Link
                    key={s.id}
                    to={`/serie/${s.id}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-2.5 hover:bg-surface-hover"
                  >
                    <span className="text-sm font-medium text-text">{s.title}</span>
                    <span className="text-xs text-muted">
                      S{episode.season}E{episode.episode}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
