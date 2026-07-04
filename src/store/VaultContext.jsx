import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  onSnapshot,
  setDoc,
  updateDoc,
  deleteField,
} from 'firebase/firestore'
import { nanoid } from 'nanoid'
import { vaultRef, firebaseConfigured } from '../lib/firebase'

const VaultContext = createContext(null)

export function episodeKey(season, episode) {
  return `S${season}E${episode}`
}

function withUpdatedAt(id, extra = {}) {
  return { [`series.${id}.updatedAt`]: Date.now(), ...extra }
}

export function VaultProvider({ children }) {
  const [seriesMap, setSeriesMap] = useState(null)
  const [error, setError] = useState(
    firebaseConfigured ? null : 'Firebase non configurato: controlla il file .env (vedi README).',
  )

  useEffect(() => {
    if (!firebaseConfigured) return

    // Make sure the shared document exists before any updateDoc() call
    // relies on it (updateDoc fails on a missing document, setDoc merges).
    setDoc(vaultRef, { series: {} }, { merge: true }).catch((err) =>
      setError(err.message),
    )

    const unsubscribe = onSnapshot(
      vaultRef,
      (snap) => setSeriesMap(snap.data()?.series ?? {}),
      (err) => setError(err.message),
    )
    return unsubscribe
  }, [])

  const series = useMemo(() => {
    if (!seriesMap) return []
    return Object.values(seriesMap).sort(
      (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
    )
  }, [seriesMap])

  async function addSeries(entry) {
    const id = entry.id
    const now = Date.now()
    await setDoc(
      vaultRef,
      {
        series: {
          [id]: {
            ...entry,
            status: entry.status ?? 'watching',
            watched: {},
            addedAt: now,
            updatedAt: now,
          },
        },
      },
      { merge: true },
    )
  }

  async function removeSeries(id) {
    await updateDoc(vaultRef, { [`series.${id}`]: deleteField() })
  }

  async function setStatus(id, status) {
    await updateDoc(vaultRef, withUpdatedAt(id, { [`series.${id}.status`]: status }))
  }

  async function toggleEpisode(id, season, episode, watched) {
    const path = `series.${id}.watched.${episodeKey(season, episode)}`
    await updateDoc(vaultRef, withUpdatedAt(id, { [path]: watched ? true : deleteField() }))
  }

  async function setSeasonWatched(id, season, episodeCount, watched) {
    const updates = withUpdatedAt(id)
    for (let ep = 1; ep <= episodeCount; ep++) {
      updates[`series.${id}.watched.${episodeKey(season, ep)}`] = watched
        ? true
        : deleteField()
    }
    await updateDoc(vaultRef, updates)
  }

  const value = {
    ready: seriesMap !== null,
    error,
    series,
    getSeries: (id) => seriesMap?.[id] ?? null,
    addSeries,
    removeSeries,
    setStatus,
    toggleEpisode,
    setSeasonWatched,
  }

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault() {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used inside VaultProvider')
  return ctx
}

export function newManualId() {
  return `manual-${nanoid(8)}`
}

export function tmdbSeriesId(tmdbId) {
  return `tmdb-${tmdbId}`
}
