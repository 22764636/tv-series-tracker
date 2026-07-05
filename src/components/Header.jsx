import { Link } from 'react-router-dom'
import HeaderSearch from './HeaderSearch'

export default function Header({ onAddSeries }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-2 text-text">
          <span className="text-base font-semibold tracking-tight sm:hidden">💙💜</span>
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">
            💙💜 TV Series Tracker
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/" className="text-sm font-medium text-muted hover:text-text">
            Libreria
          </Link>
          <Link to="/calendario" className="text-sm font-medium text-muted hover:text-text">
            Calendario
          </Link>
          <HeaderSearch />
          {onAddSeries && (
            <button
              onClick={onAddSeries}
              className="rounded-full bg-accent-solid px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-solid-hover sm:px-4 sm:py-2"
            >
              + Aggiungi serie
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
