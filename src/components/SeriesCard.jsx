import { Link } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import StatusBadge from './StatusBadge'
import { nextEpisode, progressRatio, totalEpisodes, watchedCount } from '../lib/progress'
import { useVault } from '../store/VaultContext'

export default function SeriesCard({ series }) {
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
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:bg-surface-hover"
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-surface-hover">
        {series.posterPath ? (
          <img
            src={series.posterPath}
            alt={series.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-muted">
            {series.title.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-text">{series.title}</h3>
          {series.link && (
            <a
              href={series.link}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="Link esterno"
              className="shrink-0 text-muted hover:text-accent"
            >
              🔗
            </a>
          )}
        </div>
        <StatusBadge status={series.status} />

        <div className="mt-auto flex flex-col gap-1.5">
          <ProgressBar ratio={progressRatio(series)} />
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {watchedCount(series)}/{total} episodi
            </span>
            {next && series.status !== 'dropped' && (
              <button
                onClick={markNextWatched}
                className="rounded-full bg-accent-solid px-2.5 py-1 font-medium text-white transition-colors hover:bg-accent-solid-hover"
              >
                Segna S{next.season}E{next.episode}
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
