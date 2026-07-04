import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVault } from '../store/VaultContext'
import { calendarEntriesByDate, dateKey, WEEKDAYS } from '../lib/schedule'

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatMonthLabel(date) {
  return capitalize(date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }))
}

function formatDayLabel(date) {
  return capitalize(
    date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
  )
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Cells for a Monday-start month grid, padded with leading/trailing nulls so
// the grid always has full weeks.
function buildMonthCells(viewMonth) {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = (firstDay.getDay() + 6) % 7 // Monday = 0

  const cells = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function Calendar() {
  const { series, setEpisodeWatchedDate } = useVault()
  const today = useMemo(() => startOfDay(new Date()), [])
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(today)

  const entriesByDate = useMemo(() => calendarEntriesByDate(series, today), [series, today])
  const cells = useMemo(() => buildMonthCells(viewMonth), [viewMonth])
  const selectedEntries = entriesByDate.get(dateKey(selectedDate)) ?? []

  function changeMonth(delta) {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  function goToday() {
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(today)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text sm:text-2xl">Calendario</h1>
        <button onClick={goToday} className="text-sm text-accent hover:underline">
          Oggi
        </button>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => changeMonth(-1)}
          aria-label="Mese precedente"
          className="rounded-full p-1.5 text-muted hover:bg-surface-hover hover:text-text"
        >
          ←
        </button>
        <p className="text-sm font-medium text-text">{formatMonthLabel(viewMonth)}</p>
        <button
          onClick={() => changeMonth(1)}
          aria-label="Mese successivo"
          className="rounded-full p-1.5 text-muted hover:bg-surface-hover hover:text-text"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted">
        {WEEKDAYS.map(({ key, label }) => (
          <div key={key} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />
          const key = dateKey(date)
          const entries = entriesByDate.get(key) ?? []
          const isToday = key === dateKey(today)
          const isSelected = key === dateKey(selectedDate)

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(date)}
              className={`flex h-12 flex-col items-center justify-start gap-1 rounded-lg border pt-1 text-xs sm:h-14 ${
                isSelected
                  ? 'border-accent-solid bg-accent-soft'
                  : isToday
                    ? 'border-accent-solid bg-surface'
                    : 'border-border bg-surface hover:bg-surface-hover'
              }`}
            >
              <span className={isToday ? 'font-semibold text-text' : 'text-text'}>
                {date.getDate()}
              </span>
              <span className="flex flex-wrap justify-center gap-0.5 px-1">
                {entries.slice(0, 4).map((entry, j) => (
                  <span
                    key={j}
                    className={`h-1.5 w-1.5 rounded-full ${
                      entry.watched ? 'bg-accent-solid' : 'bg-muted'
                    }`}
                  />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-text">{formatDayLabel(selectedDate)}</h2>
        {selectedEntries.length === 0 ? (
          <p className="text-sm text-muted">Nessun episodio per questo giorno.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {selectedEntries.map(({ series: s, episode, watched }, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5"
              >
                <Link to={`/serie/${s.id}`} className="min-w-0 flex-1 text-sm font-medium text-text hover:text-accent">
                  {s.title}
                  <span className="ml-2 text-xs font-normal text-muted">
                    S{episode.season}E{episode.episode}
                  </span>
                </Link>
                {watched && (
                  <input
                    type="date"
                    value={dateKey(selectedDate)}
                    onChange={(e) =>
                      setEpisodeWatchedDate(s.id, episode.season, episode.episode, e.target.value)
                    }
                    className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
