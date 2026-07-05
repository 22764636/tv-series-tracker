import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useVault } from '../store/VaultContext'
import { filterSeriesByTitle } from '../lib/search'

// Desktop-only inline search (hidden below sm, replaced by the mobile FAB +
// modal on Home). Disabled while on a series detail page — searching would
// just navigate away from the very series you're looking at.
export default function HeaderSearch() {
  const { series } = useVault()
  const navigate = useNavigate()
  const location = useLocation()
  const disabled = location.pathname.startsWith('/serie/')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== '/' || disabled) return
      const el = document.activeElement
      const isTyping = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (isTyping) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [disabled])

  const results = disabled ? [] : filterSeriesByTitle(series, query)

  function selectResult(s) {
    navigate(`/serie/${s.id}`)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && results.length > 0) selectResult(results[0])
    else if (e.key === 'Escape') {
      setQuery('')
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative hidden sm:block">
      <input
        ref={inputRef}
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'Cerca' : 'Cerca... ( / )'}
        className="w-40 rounded-full border border-border bg-surface px-3.5 py-1.5 pr-7 text-sm text-text outline-none focus:border-accent focus:w-56 transition-all disabled:cursor-not-allowed disabled:opacity-50"
      />
      {query && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setQuery('')
            inputRef.current?.focus()
          }}
          aria-label="Cancella ricerca"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text"
        >
          ✕
        </button>
      )}
      {open && results.length > 0 && (
        <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-xl border border-border bg-surface p-1 shadow-xl">
          {results.map((s) => (
            <button
              key={s.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectResult(s)}
              className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-surface-hover"
            >
              <div className="h-10 w-7 shrink-0 overflow-hidden rounded bg-surface-hover">
                {s.posterPath && <img src={s.posterPath} alt="" className="h-full w-full object-cover" />}
              </div>
              <span className="truncate text-sm text-text">{s.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
