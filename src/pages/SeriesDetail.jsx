import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useVault } from '../store/VaultContext'
import ProgressBar from '../components/ProgressBar'
import { progressRatio, totalEpisodes, watchedCount, episodeKey, STATUS_META } from '../lib/progress'
import { WEEKDAYS } from '../lib/schedule'

export default function SeriesDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    getSeries,
    setStatus,
    setLink,
    setWatchDays,
    setRating,
    toggleEpisode,
    setSeasonWatched,
    removeSeries,
  } = useVault()
  const series = getSeries(id)

  if (!series) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6">
        <p className="text-muted">Serie non trovata.</p>
        <button onClick={() => navigate('/')} className="mt-3 text-accent hover:underline">
          Torna alla libreria
        </button>
      </div>
    )
  }

  const locked = series.status === 'dropped'
  const complete = progressRatio(series) === 1

  async function handleDelete() {
    if (!window.confirm(`Eliminare "${series.title}" dalla libreria?`)) return
    await removeSeries(series.id)
    navigate('/')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <button onClick={() => navigate('/')} className="mb-4 text-sm text-muted hover:text-text">
        ← Libreria
      </button>

      <div className="flex gap-4 sm:gap-6">
        <div className="h-40 w-28 shrink-0 overflow-hidden rounded-xl bg-surface-hover sm:h-52 sm:w-36">
          {series.posterPath ? (
            <img src={series.posterPath} alt={series.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-muted">
              {series.title.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="text-xl font-semibold text-text sm:text-2xl">{series.title}</h1>

          <div className="flex flex-wrap gap-1.5">
            {Object.entries(STATUS_META).map(([key, meta]) => {
              const disabled = key === 'completed' && !complete
              return (
                <button
                  key={key}
                  disabled={disabled}
                  onClick={() => !disabled && setStatus(series.id, key)}
                  title={disabled ? 'Disponibile solo quando tutti gli episodi sono visti' : undefined}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    series.status === key
                      ? 'border-accent-solid bg-accent-solid text-white'
                      : disabled
                        ? 'cursor-not-allowed border-border text-muted opacity-50'
                        : 'border-border text-muted hover:bg-surface-hover'
                  }`}
                >
                  {meta.label}
                </button>
              )
            })}
          </div>

          <div>
            <ProgressBar ratio={progressRatio(series)} />
            <p className="mt-1 text-sm text-muted">
              {watchedCount(series)}/{totalEpisodes(series)} episodi visti
            </p>
          </div>

          <LinkRow series={series} onSetLink={(link) => setLink(series.id, link)} />

          <WatchDaysRow
            series={series}
            locked={locked}
            onSetWatchDays={(days) => setWatchDays(series.id, days)}
          />

          <RatingRow series={series} onSetRating={(rating) => setRating(series.id, rating)} />

          <button
            onClick={handleDelete}
            className="mt-auto self-start text-sm text-danger hover:underline"
          >
            Elimina serie
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {locked && (
          <p className="text-sm text-muted">
            Serie abbandonata: rimetti lo stato su "In corso" o "Da vedere" per poter segnare
            episodi.
          </p>
        )}
        {series.seasons
          .slice()
          .sort((a, b) => a.number - b.number)
          .map((season) => (
            <SeasonBlock
              key={season.number}
              series={series}
              season={season}
              locked={locked}
              onToggleEpisode={toggleEpisode}
              onToggleSeason={setSeasonWatched}
            />
          ))}
      </div>
    </div>
  )
}

function LinkRow({ series, onSetLink }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(series.link ?? '')

  async function save(e) {
    e.preventDefault()
    await onSetLink(value.trim() || null)
    setEditing(false)
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://..."
          className="w-full max-w-xs rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
        />
        <button type="submit" className="text-xs font-medium text-accent hover:underline">
          Salva
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-muted hover:text-text"
        >
          Annulla
        </button>
      </form>
    )
  }

  if (series.link) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <a
          href={series.link}
          target="_blank"
          rel="noreferrer"
          className="max-w-[220px] truncate text-accent hover:underline"
        >
          🔗 {series.link}
        </a>
        <button
          onClick={() => {
            setValue(series.link)
            setEditing(true)
          }}
          className="text-xs text-muted hover:text-text"
        >
          Modifica
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="self-start text-sm text-accent hover:underline"
    >
      + Aggiungi link
    </button>
  )
}

function WatchDaysRow({ series, locked, onSetWatchDays }) {
  const days = series.watchDays ?? []

  function toggleDay(key) {
    if (locked) return
    const next = days.includes(key) ? days.filter((d) => d !== key) : [...days, key]
    onSetWatchDays(next)
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-text">Giorni di visione</p>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map(({ key, label }) => {
          const active = days.includes(key)
          return (
            <button
              key={key}
              disabled={locked}
              onClick={() => toggleDay(key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? 'border-accent-solid bg-accent-solid text-white'
                  : locked
                    ? 'cursor-not-allowed border-border text-muted opacity-50'
                    : 'border-border text-muted hover:bg-surface-hover'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RatingRow({ series, onSetRating }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(series.rating ?? '')

  if (series.status !== 'completed') return null

  async function save(e) {
    e.preventDefault()
    if (value === '') {
      await onSetRating(null)
    } else {
      const clamped = Math.min(10, Math.max(1, Math.round(Number(value) * 2) / 2))
      await onSetRating(clamped)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex items-center gap-2">
        <input
          autoFocus
          type="number"
          min="1"
          max="10"
          step="0.5"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="1-10"
          className="w-20 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-accent"
        />
        <button type="submit" className="text-xs font-medium text-accent hover:underline">
          Salva
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-muted hover:text-text"
        >
          Annulla
        </button>
      </form>
    )
  }

  if (series.rating != null) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-text">Valutazione: {series.rating}/10</span>
        <button
          onClick={() => {
            setValue(series.rating)
            setEditing(true)
          }}
          className="text-xs text-muted hover:text-text"
        >
          Modifica
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="self-start text-sm text-accent hover:underline"
    >
      + Aggiungi valutazione
    </button>
  )
}

function SeasonBlock({ series, season, locked, onToggleEpisode, onToggleSeason }) {
  const episodes = Array.from({ length: season.episodeCount }, (_, i) => i + 1)
  const allWatched = episodes.every((ep) => series.watched?.[episodeKey(season.number, ep)])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Stagione {season.number}</h2>
        <button
          disabled={locked}
          onClick={() => onToggleSeason(series.id, season.number, season.episodeCount, !allWatched)}
          className={`text-xs font-medium ${
            locked
              ? 'cursor-not-allowed text-muted opacity-50'
              : 'text-accent hover:underline'
          }`}
        >
          {allWatched ? 'Segna non vista' : 'Segna tutta vista'}
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
        {episodes.map((ep) => {
          const watched = Boolean(series.watched?.[episodeKey(season.number, ep)])
          return (
            <button
              key={ep}
              disabled={locked}
              onClick={() => onToggleEpisode(series.id, season.number, ep, !watched)}
              className={`aspect-square rounded-lg border text-xs font-medium transition-colors ${
                watched
                  ? 'border-accent-solid bg-accent-solid text-white'
                  : 'border-border bg-surface text-muted hover:bg-surface-hover'
              } ${locked ? 'cursor-not-allowed opacity-50' : ''}`}
              title={`S${season.number}E${ep}`}
            >
              {ep}
            </button>
          )
        })}
      </div>
    </div>
  )
}
