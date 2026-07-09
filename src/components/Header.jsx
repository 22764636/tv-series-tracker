import { Link, useLocation, useSearchParams } from 'react-router-dom'
import HeaderSearch from './HeaderSearch'
import CalendarIcon from './CalendarIcon'

const VIEWER_FILTER_OPTIONS = [
  { value: 'blue', label: '💙' },
  { value: 'purple', label: '💜' },
]

// Quick "just mine" library filter, reachable from every page (not only
// Home) since the header is rendered outside <Routes> — clicking a heart
// navigates to the library with `?viewer=` set, same strict filter and same
// URL param Home.jsx already reads (see soloViewer()/VIEWER_KEYS there).
// Clicking the already-active heart clears it back to "Tutte" (no explicit
// "Tutte" button here, unlike the status pills, since there's only room for
// two icons — deselecting the active one is the equivalent gesture).
// Existing status/sort params are preserved when already on the library;
// navigating in from elsewhere (e.g. a series page) starts a clean `/?viewer=...`.
function ViewerHeaderFilter() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const onLibrary = location.pathname === '/'
  const active = onLibrary ? searchParams.get('viewer') : null

  function hrefFor(value) {
    const params = onLibrary ? new URLSearchParams(searchParams) : new URLSearchParams()
    if (active === value) params.delete('viewer')
    else params.set('viewer', value)
    const qs = params.toString()
    return `/${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="flex items-center gap-1">
      {VIEWER_FILTER_OPTIONS.map((opt) => (
        <Link
          key={opt.value}
          to={hrefFor(opt.value)}
          aria-label={`Filtra: solo ${opt.label}`}
          aria-pressed={active === opt.value}
          title={`Filtra: solo ${opt.label}`}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition-colors ${
            active === opt.value ? 'bg-accent-solid' : 'hover:bg-surface-hover'
          }`}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  )
}

export default function Header({ onAddSeries }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" aria-label="TV Series Tracker" className="shrink-0">
          <img
            src={`${import.meta.env.BASE_URL}icon-512.png`}
            alt="TV Series Tracker"
            className="h-9 w-9 sm:h-10 sm:w-10"
          />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/calendario"
            aria-label="Calendario"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-accent active:bg-surface-hover sm:h-auto sm:w-auto sm:rounded-none sm:text-sm sm:font-medium sm:hover:bg-transparent sm:active:bg-transparent sm:hover:text-text"
          >
            <span className="sm:hidden">
              <CalendarIcon />
            </span>
            <span className="hidden sm:inline">Calendario</span>
          </Link>
          <ViewerHeaderFilter />
          <HeaderSearch />
          {onAddSeries && (
            <button
              onClick={onAddSeries}
              aria-label="Aggiungi serie"
              className="rounded-full bg-accent-solid px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-solid-hover sm:px-4 sm:py-2"
            >
              <span className="sm:hidden">+</span>
              <span className="hidden sm:inline">+ Aggiungi serie</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
