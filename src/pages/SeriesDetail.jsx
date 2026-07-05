import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useVault } from '../store/VaultContext'
import ProgressBar from '../components/ProgressBar'
import RatingChart from '../components/RatingChart'
import Modal from '../components/Modal'
import RefreshIcon from '../components/RefreshIcon'
import {
  progressRatio,
  totalEpisodes,
  watchedCount,
  episodeKey,
  STATUS_META,
  averageRating,
  formatRating,
  episodeRatingChartData,
  remainingMinutes,
  formatDuration,
} from '../lib/progress'
import { WEEKDAYS } from '../lib/schedule'
import { wikipediaUrl } from '../lib/wikipedia'

export default function SeriesDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    getSeries,
    setStatus,
    setLink,
    setWatchDays,
    setRating,
    setEpisodeRating,
    setEpisodeDuration,
    setWikipediaLink,
    refreshFromTmdb,
    toggleEpisode,
    setSeasonWatched,
    removeSeries,
  } = useVault()
  const series = getSeries(id)

  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
  const chartData = episodeRatingChartData(series)
  const remaining = remainingMinutes(series)
  const showRatingSection = series.status === 'completed' || chartData.length > 0

  async function handleRefresh() {
    setRefreshing(true)
    setRefreshError(null)
    try {
      await refreshFromTmdb(series.id)
    } catch (e) {
      setRefreshError(e.message)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleDelete() {
    await removeSeries(series.id)
    navigate('/')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <button onClick={() => navigate('/')} className="mb-4 text-sm text-muted hover:text-text">
        ← Libreria
      </button>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="h-40 w-28 shrink-0 overflow-hidden rounded-xl bg-surface-hover sm:h-52 sm:w-36">
          {series.posterPath ? (
            <img src={series.posterPath} alt={series.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-muted">
              {series.title.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-semibold text-text sm:text-2xl">{series.title}</h1>
            <div className="flex shrink-0 items-center gap-1">
              {series.source === 'tmdb' && (
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="Aggiorna da TMDB"
                  title="Aggiorna da TMDB"
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-accent active:bg-surface-hover disabled:opacity-50 ${
                    refreshing ? 'animate-spin' : ''
                  }`}
                >
                  <RefreshIcon />
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                aria-label="Elimina serie"
                title="Elimina serie"
                className="flex h-8 w-8 items-center justify-center rounded-full text-base leading-none text-muted hover:bg-surface-hover hover:text-danger active:bg-surface-hover"
              >
                ✕
              </button>
            </div>
          </div>
          {refreshError && <p className="text-xs text-danger">{refreshError}</p>}

          <div className="flex flex-wrap gap-1.5">
            {Object.entries(STATUS_META).map(([key, meta]) => {
              const disabled = (key === 'completed' || key === 'renewed') && !complete
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
              {remaining > 0 && ` · ${formatDuration(remaining)} rimanenti`}
            </p>
          </div>

          <LinkRow series={series} onSetLink={(link) => setLink(series.id, link)} />

          <WikipediaRow
            series={series}
            onSetWikipediaLink={(lang, url) => setWikipediaLink(series.id, lang, url)}
          />
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmDeleteModal
          title={series.title}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        />
      )}

      <div className="mt-6 flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <WatchDaysRow
            series={series}
            locked={locked}
            onSetWatchDays={(days) => setWatchDays(series.id, days)}
          />
        </div>

        {showRatingSection && (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <RatingRow series={series} onSetRating={(heart, rating) => setRating(series.id, heart, rating)} />
            {chartData.length > 0 && (
              <RatingChart
                data={chartData}
                totalBlue={series.ratingBlue}
                totalPurple={series.ratingPurple}
                totalAverage={averageRating(series)}
                className={series.status === 'completed' ? 'mt-4' : ''}
              />
            )}
          </div>
        )}
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
              onSetEpisodeRating={(season, episode, heart, value) =>
                setEpisodeRating(series.id, season, episode, heart, value)
              }
              onSetEpisodeDuration={(season, episode, minutes) =>
                setEpisodeDuration(series.id, season, episode, minutes)
              }
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

// Guessed by default from the title (wikipediaUrl) — never stored unless the
// user overrides it, e.g. because the guessed URL lands on the wrong article
// or a disambiguation page. Clearing an override goes back to the guess.
function WikipediaRow({ series, onSetWikipediaLink }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <WikipediaLink
        label="Wikipedia (EN)"
        value={series.wikipediaEn}
        computed={wikipediaUrl(series.title, 'en')}
        onSave={(url) => onSetWikipediaLink('en', url)}
      />
      <WikipediaLink
        label="Wikipedia (IT)"
        value={series.wikipediaIt}
        computed={wikipediaUrl(series.title, 'it')}
        onSave={(url) => onSetWikipediaLink('it', url)}
      />
    </div>
  )
}

function WikipediaLink({ label, value, computed, onSave }) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(value ?? computed)
  const href = value ?? computed

  async function save(e) {
    e.preventDefault()
    const trimmed = input.trim()
    await onSave(trimmed === computed ? null : trimmed || null)
    setEditing(false)
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex items-center gap-2 text-sm">
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
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

  return (
    <div className="flex items-center gap-2 text-sm">
      <a href={href} target="_blank" rel="noreferrer" className="text-accent hover:underline">
        {label}
      </a>
      <button
        onClick={() => {
          setInput(value ?? computed)
          setEditing(true)
        }}
        className="text-xs text-muted hover:text-text"
      >
        Modifica
      </button>
    </div>
  )
}

function ConfirmDeleteModal({ title, onCancel, onConfirm }) {
  return (
    <Modal title="Eliminare la serie?" onClose={onCancel}>
      <p className="text-sm text-muted">
        Stai per eliminare <span className="font-medium text-text">"{title}"</span> dalla libreria.
        Questa azione non può essere annullata.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover"
        >
          Annulla
        </button>
        <button
          onClick={onConfirm}
          className="rounded-full bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Elimina
        </button>
      </div>
    </Modal>
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
      {/* grid-cols-7 on mobile divides the actual available width into 7
          equal columns, guaranteeing one row on any real device — a fixed
          px width (e.g. w-10) only fits whatever viewport it was tuned
          against and silently wraps on narrower phones. Desktop has room
          to spare, so it switches to a flex row of fixed-width pills. */}
      <div className="grid grid-cols-7 gap-1 sm:flex sm:flex-wrap sm:gap-1.5">
        {WEEKDAYS.map(({ key, shortLabel, fullLabel }) => {
          const active = days.includes(key)
          return (
            <button
              key={key}
              disabled={locked}
              onClick={() => toggleDay(key)}
              className={`rounded-full border py-1 text-xs font-medium transition-colors sm:w-28 sm:text-sm ${
                active
                  ? 'border-accent-solid bg-accent-solid text-white'
                  : locked
                    ? 'cursor-not-allowed border-border text-muted opacity-50'
                    : 'border-border text-muted hover:bg-surface-hover'
              }`}
            >
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{fullLabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RatingRow({ series, onSetRating }) {
  if (series.status !== 'completed') return null

  const rating = averageRating(series)

  return (
    <div className="flex flex-col gap-1.5">
      {rating != null && (
        <span className="text-sm text-text">Valutazione: {formatRating(rating)}/10</span>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <HeartRating
          label="💙"
          value={series.ratingBlue}
          onSave={(v) => onSetRating('blue', v)}
        />
        <HeartRating
          label="💜"
          value={series.ratingPurple}
          onSave={(v) => onSetRating('purple', v)}
        />
      </div>
    </div>
  )
}

function HeartRating({ label, value, onSave }) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(value ?? '')

  async function save(e) {
    e.preventDefault()
    if (input === '') {
      await onSave(null)
    } else {
      const clamped = Math.min(10, Math.max(1, Math.round(Number(input) * 100) / 100))
      await onSave(clamped)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex items-center gap-2 text-sm">
        <span>{label}</span>
        <input
          autoFocus
          type="number"
          min="1"
          max="10"
          step="0.01"
          value={input}
          onChange={(e) => setInput(e.target.value)}
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

  if (value != null) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-text">{label} {formatRating(value)}/10</span>
        <button
          onClick={() => {
            setInput(value)
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
      className="text-sm text-accent hover:underline"
    >
      {label} + Aggiungi
    </button>
  )
}

function SeasonBlock({
  series,
  season,
  locked,
  onToggleEpisode,
  onToggleSeason,
  onSetEpisodeRating,
  onSetEpisodeDuration,
}) {
  const episodes = Array.from({ length: season.episodeCount }, (_, i) => i + 1)
  const allWatched = episodes.every((ep) => series.watched?.[episodeKey(season.number, ep)])
  // A row shows for any watched episode (rating) and, for manual series,
  // every episode (duration must be enterable before it's even watched, so
  // remaining-time has something to sum) — TMDB episodes only get a row once
  // watched or once a duration has actually been fetched for them.
  const relevantEpisodes = episodes.filter((ep) => {
    const key = episodeKey(season.number, ep)
    const watched = Boolean(series.watched?.[key])
    const hasDuration = series.episodeDurations?.[key] != null
    return watched || series.source === 'manual' || hasDuration
  })
  const seasonRemaining = remainingMinutes(series, season.number)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h2 className="text-sm font-semibold text-text">Stagione {season.number}</h2>
          {seasonRemaining > 0 && (
            <span className="text-xs text-muted">{formatDuration(seasonRemaining)} rimanenti</span>
          )}
        </div>
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

      {relevantEpisodes.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {relevantEpisodes.map((ep) => {
            const key = episodeKey(season.number, ep)
            const watched = Boolean(series.watched?.[key])
            const rating = series.episodeRatings?.[key]
            return (
              <div
                key={ep}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
              >
                <span className="text-muted">S{season.number}E{ep}</span>
                <div className="flex items-center gap-3">
                  <DurationField
                    minutes={series.episodeDurations?.[key]}
                    onSave={
                      series.source === 'manual'
                        ? (v) => onSetEpisodeDuration(season.number, ep, v)
                        : null
                    }
                  />
                  {watched && (
                    <>
                      <HeartRating
                        label="💙"
                        value={rating?.blue}
                        onSave={(v) => onSetEpisodeRating(season.number, ep, 'blue', v)}
                      />
                      <HeartRating
                        label="💜"
                        value={rating?.purple}
                        onSave={(v) => onSetEpisodeRating(season.number, ep, 'purple', v)}
                      />
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DurationField({ minutes, onSave }) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(minutes ?? '')

  if (!onSave) {
    return minutes != null ? <span className="text-xs text-muted">{minutes} min</span> : null
  }

  async function save(e) {
    e.preventDefault()
    if (input === '') await onSave(null)
    else await onSave(Math.max(1, Math.round(Number(input))))
    setEditing(false)
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex items-center gap-2 text-xs">
        <input
          autoFocus
          type="number"
          min="1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="min"
          className="w-16 rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-accent"
        />
        <button type="submit" className="font-medium text-accent hover:underline">
          Salva
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-muted hover:text-text">
          Annulla
        </button>
      </form>
    )
  }

  if (minutes != null) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted">{minutes} min</span>
        <button
          onClick={() => {
            setInput(minutes)
            setEditing(true)
          }}
          className="text-muted hover:text-text"
        >
          Modifica
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setEditing(true)} className="text-xs text-accent hover:underline">
      + Durata
    </button>
  )
}
