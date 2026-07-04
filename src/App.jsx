import { useState } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import AddSeriesModal from './components/AddSeriesModal'
import Home from './pages/Home'
import SeriesDetail from './pages/SeriesDetail'
import { VaultProvider, useVault } from './store/VaultContext'

function AppShell() {
  const { ready, error } = useVault()
  const [showAdd, setShowAdd] = useState(false)

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
        </Routes>
      )}

      {showAdd && <AddSeriesModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <VaultProvider>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </VaultProvider>
  )
}
