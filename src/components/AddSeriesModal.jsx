import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal'
import { posterUrl, searchShows, getShowDetails, tmdbConfigured } from '../lib/tmdb'
import { useVault, newManualId, tmdbSeriesId } from '../store/VaultContext'

const TABS = [
  { key: 'search', label: 'Cerca (TMDB)' },
  { key: 'manual', label: 'Manuale' },
]

export default function AddSeriesModal({ onClose }) {
  const [tab, setTab] = useState(tmdbConfigured ? 'search' : 'manual')

  return (
    <Modal title="Aggiungi serie" onClose={onClose} wide>
      <div className="mb-4 flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key
                ? 'border-accent-solid text-text'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'search' ? (
        <SearchTab onClose={onClose} />
      ) : (
        <ManualTab onClose={onClose} />
      )}
    </Modal>
  )
}

function SearchTab({ onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [addingId, setAddingId] = useState(null)
  const { addSeries, getSeries } = useVault()
  const navigate = useNavigate()

  useEffect(() => {
    if (!tmdbConfigured) return
    if (!query.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    setError(null)
    const timer = setTimeout(() => {
      searchShows(query)
        .then(setResults)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  if (!tmdbConfigured) {
    return (
      <p className="text-sm text-muted">
        La ricerca TMDB richiede la variabile d'ambiente{' '}
        <code className="rounded bg-surface-hover px-1.5 py-0.5">VITE_TMDB_API_KEY</code>. Nel
        frattempo usa la tab &quot;Manuale&quot;.
      </p>
    )
  }

  async function handleAdd(result) {
    const id = tmdbSeriesId(result.tmdbId)
    if (getSeries(id)) {
      navigate(`/serie/${id}`)
      onClose()
      return
    }
    setAddingId(result.tmdbId)
    try {
      const details = await getShowDetails(result.tmdbId)
      await addSeries({
        id,
        source: 'tmdb',
        title: details.title,
        posterPath: posterUrl(details.posterPath),
        seasons: details.seasons,
      })
      onClose()
      navigate(`/serie/${id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca una serie TV..."
        className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent"
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex max-h-80 flex-col gap-1 overflow-y-auto">
        {loading && <p className="py-4 text-center text-sm text-muted">Ricerca in corso...</p>}
        {!loading &&
          results.map((r) => (
            <button
              key={r.tmdbId}
              onClick={() => handleAdd(r)}
              disabled={addingId === r.tmdbId}
              className="flex items-center gap-3 rounded-xl p-2 text-left hover:bg-surface-hover disabled:opacity-50"
            >
              <div className="h-16 w-11 shrink-0 overflow-hidden rounded-md bg-surface-hover">
                {r.posterPath && (
                  <img src={posterUrl(r.posterPath)} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-text">{r.title}</p>
                {r.year && <p className="text-xs text-muted">{r.year}</p>}
              </div>
            </button>
          ))}
        {!loading && query.trim() && results.length === 0 && !error && (
          <p className="py-4 text-center text-sm text-muted">Nessun risultato.</p>
        )}
      </div>
    </div>
  )
}

function ManualTab({ onClose }) {
  const [title, setTitle] = useState('')
  const [posterPath, setPosterPath] = useState('')
  const [seasons, setSeasons] = useState([{ number: 1, episodeCount: '' }])
  const [error, setError] = useState(null)
  const { addSeries } = useVault()
  const navigate = useNavigate()

  function updateSeason(index, field, value) {
    setSeasons((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    )
  }

  function addSeasonRow() {
    setSeasons((prev) => [...prev, { number: prev.length + 1, episodeCount: '' }])
  }

  function removeSeasonRow(index) {
    setSeasons((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const cleanSeasons = seasons
      .map((s) => ({ number: Number(s.number), episodeCount: Number(s.episodeCount) }))
      .filter((s) => s.number > 0 && s.episodeCount > 0)

    if (!title.trim()) return setError('Il titolo è obbligatorio.')
    if (cleanSeasons.length === 0) return setError('Aggiungi almeno una stagione con episodi.')

    const id = newManualId()
    await addSeries({
      id,
      source: 'manual',
      title: title.trim(),
      posterPath: posterPath.trim() || null,
      seasons: cleanSeasons,
    })
    onClose()
    navigate(`/serie/${id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-text">Titolo</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titolo della serie"
          className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-text">
          URL poster <span className="text-muted">(opzionale)</span>
        </label>
        <input
          value={posterPath}
          onChange={(e) => setPosterPath(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium text-text">Stagioni</label>
          <button
            type="button"
            onClick={addSeasonRow}
            className="text-sm font-medium text-accent hover:underline"
          >
            + stagione
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {seasons.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-sm text-muted">Stagione</span>
              <input
                type="number"
                min="1"
                value={s.number}
                onChange={(e) => updateSeason(i, 'number', e.target.value)}
                className="w-16 rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
              />
              <span className="shrink-0 text-sm text-muted">episodi</span>
              <input
                type="number"
                min="1"
                value={s.episodeCount}
                onChange={(e) => updateSeason(i, 'episodeCount', e.target.value)}
                className="w-16 rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent"
              />
              {seasons.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSeasonRow(i)}
                  aria-label="Rimuovi stagione"
                  className="ml-auto rounded-full p-1.5 text-muted hover:bg-surface-hover hover:text-danger"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        className="rounded-xl bg-accent-solid px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-solid-hover"
      >
        Aggiungi serie
      </button>
    </form>
  )
}
