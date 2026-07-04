import { Link } from 'react-router-dom'

export default function Header({ onAddSeries }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-text">
          <span className="text-xl">📺</span>
          <span className="text-lg font-semibold tracking-tight">Serie</span>
        </Link>
        {onAddSeries && (
          <button
            onClick={onAddSeries}
            className="rounded-full bg-accent-solid px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-solid-hover"
          >
            + Aggiungi serie
          </button>
        )}
      </div>
    </header>
  )
}
