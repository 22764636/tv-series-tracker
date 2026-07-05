import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal'
import { useVault } from '../store/VaultContext'
import { filterSeriesByTitle } from '../lib/search'

export default function MobileSearchModal({ onClose }) {
  const { series } = useVault()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const results = filterSeriesByTitle(series, query)

  function selectResult(s) {
    navigate(`/serie/${s.id}`)
    onClose()
  }

  return (
    <Modal title="Cerca serie" onClose={onClose}>
      <div className="relative">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per titolo..."
          className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 pr-9 text-sm text-text outline-none focus:border-accent"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Cancella ricerca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text"
          >
            ✕
          </button>
        )}
      </div>
      <div className="mt-3 flex max-h-80 flex-col gap-1 overflow-y-auto">
        {query.trim() && results.length === 0 && (
          <p className="py-4 text-center text-sm text-muted">Nessun risultato.</p>
        )}
        {results.map((s) => (
          <button
            key={s.id}
            onClick={() => selectResult(s)}
            className="flex items-center gap-3 rounded-xl p-2 text-left hover:bg-surface-hover"
          >
            <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-surface-hover">
              {s.posterPath && <img src={s.posterPath} alt="" className="h-full w-full object-cover" />}
            </div>
            <span className="text-sm font-medium text-text">{s.title}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
