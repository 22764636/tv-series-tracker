import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import AddSeriesModal from './components/AddSeriesModal'
import MobileSearchModal from './components/MobileSearchModal'
import SearchIcon from './components/SearchIcon'
import Home from './pages/Home'
import SeriesDetail from './pages/SeriesDetail'
import Calendar from './pages/Calendar'
import { VaultProvider, useVault } from './store/VaultContext'

function AppShell() {
  const { ready, error } = useVault()
  const [showAdd, setShowAdd] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  return (
    <div className="min-h-svh">
      <Header onAddSeries={() => setShowAdd(true)} />

      {error ? (
        <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6">
          <p className="text-danger">{error}</p>
        </div>
      ) : !ready ? (
        <div className="mx-auto max-w-3xl px-4 py-10 text-center text-muted sm:px-6">
          Caricamento...
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/serie/:id" element={<SeriesDetail />} />
          <Route path="/calendario" element={<Calendar />} />
        </Routes>
      )}

      {showAdd && <AddSeriesModal onClose={() => setShowAdd(false)} />}

      {/* Mobile-only search trigger: lives in the shell (not Home) so it's
          available on every page, matching desktop's always-on header search. */}
      <button
        onClick={() => setShowSearch(true)}
        aria-label="Cerca serie"
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent-solid text-white shadow-lg transition-colors hover:bg-accent-solid-hover sm:hidden"
      >
        <SearchIcon />
      </button>
      {showSearch && <MobileSearchModal onClose={() => setShowSearch(false)} />}
    </div>
  )
}

export default function App() {
  useEffect(() => {
    // Installed PWAs (standalone display) can hit the bottom of the browser
    // history stack right on the home screen, which on Android shows a blank
    // frame while the OS tears down the activity before the *next* back
    // press actually closes it. Padding the stack with one extra entry on
    // load gives the first back press something of ours to consume instead.
    if (window.matchMedia('(display-mode: standalone)').matches) {
      window.history.pushState(null, '', window.location.href)
    }
  }, [])

  return (
    <VaultProvider>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </VaultProvider>
  )
}
