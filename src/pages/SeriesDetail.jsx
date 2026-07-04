import { useNavigate, useParams } from 'react-router-dom'
import { useVault, episodeKey } from '../store/VaultContext'
import ProgressBar from '../components/ProgressBar'
import { progressRatio, totalEpisodes, watchedCount, STATUS_META } from '../lib/progress'

export default function SeriesDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getSeries, setStatus, toggleEpisode, setSeasonWatched, removeSeries } = useVault()
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
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setStatus(series.id, key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  series.status === key
                    ? 'border-accent-solid bg-accent-solid text-white'
                    : 'border-border text-muted hover:bg-surface-hover'
                }`}
              >
                {meta.label}
              </button>
            ))}
          </div>

          <div>
            <ProgressBar ratio={progressRatio(series)} />
            <p className="mt-1 text-sm text-muted">
              {watchedCount(series)}/{totalEpisodes(series)} episodi visti
            </p>
          </div>

          <button
            onClick={handleDelete}
            className="mt-auto self-start text-sm text-danger hover:underline"
          >
            Elimina serie
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {series.seasons
          .slice()
          .sort((a, b) => a.number - b.number)
          .map((season) => (
            <SeasonBlock
              key={season.number}
              series={series}
              season={season}
              onToggleEpisode={toggleEpisode}
              onToggleSeason={setSeasonWatched}
            />
          ))}
      </div>
    </div>
  )
}

function SeasonBlock({ series, season, onToggleEpisode, onToggleSeason }) {
  const episodes = Array.from({ length: season.episodeCount }, (_, i) => i + 1)
  const allWatched = episodes.every((ep) => series.watched?.[episodeKey(season.number, ep)])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Stagione {season.number}</h2>
        <button
          onClick={() => onToggleSeason(series.id, season.number, season.episodeCount, !allWatched)}
          className="text-xs font-medium text-accent hover:underline"
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
              onClick={() => onToggleEpisode(series.id, season.number, ep, !watched)}
              className={`aspect-square rounded-lg border text-xs font-medium transition-colors ${
                watched
                  ? 'border-accent-solid bg-accent-solid text-white'
                  : 'border-border bg-surface text-muted hover:bg-surface-hover'
              }`}
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
