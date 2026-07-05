import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  onSnapshot,
  setDoc,
  updateDoc,
  deleteField,
} from 'firebase/firestore'
import { nanoid } from 'nanoid'
import { vaultRef, firebaseConfigured } from '../lib/firebase'
import { episodeKey, totalEpisodes } from '../lib/progress'
import { dateKey } from '../lib/schedule'
import { getShowDetails, posterUrl } from '../lib/tmdb'

const VaultContext = createContext(null)

function withUpdatedAt(id, extra = {}) {
  return { [`series.${id}.updatedAt`]: Date.now(), ...extra }
}

// Marking an episode watched can trigger an automatic status change:
// - if the series is still "planned" (Da vedere), watching its first
//   episode bumps it to "watching" (In corso).
// - if this toggle brings the watched count to the full total, the series
//   is marked either "completed" (Completata) or, if TMDB says the show is
//   still ongoing (`series.ongoing`, see tmdb.js isOngoing), "renewed" (In
//   attesa di nuova stagione) instead — there's more to watch eventually,
//   it's just not out yet. Manual entries have no `ongoing` info and always
//   go to "completed", same as before. Un-watching an episode never reverts
//   an already-completed/renewed series (no auto-revert) — the one place
//   status *does* move backwards automatically is refreshFromTmdb below,
//   when a refresh reveals genuinely new unwatched episodes.
function autoStatusUpdates(series, id, newWatched) {
  const total = totalEpisodes(series)
  if (total > 0 && Object.keys(newWatched).length >= total) {
    const status = series.ongoing ? 'renewed' : 'completed'
    return { [`series.${id}.status`]: status }
  }
  if (series.status === 'planned') {
    return { [`series.${id}.status`]: 'watching' }
  }
  return {}
}

export function VaultProvider({ children }) {
  const [seriesMap, setSeriesMap] = useState(null)
  const [error, setError] = useState(
    firebaseConfigured ? null : 'Firebase non configurato: controlla il file .env (vedi README).',
  )

  useEffect(() => {
    if (!firebaseConfigured) return

    // Do NOT pre-create the doc with setDoc(vaultRef, { series: {} }, { merge: true })
    // here: Firestore computes merge field masks from leaf keys, and an empty
    // object has none, so it falls back to replacing the whole `series` map —
    // wiping every device's data on the next app load. addSeries() below already
    // creates the doc on first write (via merge), so no bootstrap is needed.
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
            status: entry.status ?? 'planned',
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

  async function setLink(id, link) {
    await updateDoc(
      vaultRef,
      withUpdatedAt(id, { [`series.${id}.link`]: link ? link : deleteField() }),
    )
  }

  async function setWatchDays(id, days) {
    await updateDoc(vaultRef, withUpdatedAt(id, { [`series.${id}.watchDays`]: days }))
  }

  // Two independent ratings (blue heart / purple heart, one per person) —
  // the displayed rating is their average (see averageRating in progress.js).
  async function setRating(id, heart, rating) {
    const field = heart === 'blue' ? 'ratingBlue' : 'ratingPurple'
    await updateDoc(
      vaultRef,
      withUpdatedAt(id, { [`series.${id}.${field}`]: rating == null ? deleteField() : rating }),
    )
  }

  // TMDB-sourced only: re-fetches title/poster/seasons/ongoing-flag from
  // TMDB and nothing else — never touches watched/status/rating/link/
  // watchDays. Exception: if the refresh reveals episodes beyond what was
  // known before on a series that's currently "completed" or "renewed" (all
  // known episodes already watched), the status is reset to "planned" (Da
  // vedere) so the normal planned->watching auto-promotion takes over again
  // once the user marks the first new episode watched.
  async function refreshFromTmdb(id) {
    const current = seriesMap?.[id]
    if (!current || current.source !== 'tmdb') return
    const tmdbId = id.replace(/^tmdb-/, '')
    const details = await getShowDetails(tmdbId)
    const updates = withUpdatedAt(id, {
      [`series.${id}.title`]: details.title,
      [`series.${id}.posterPath`]: posterUrl(details.posterPath),
      [`series.${id}.seasons`]: details.seasons,
      [`series.${id}.ongoing`]: details.ongoing,
    })
    const newTotal = details.seasons.reduce((sum, s) => sum + s.episodeCount, 0)
    const hadNewEpisodes = newTotal > totalEpisodes(current)
    if (hadNewEpisodes && (current.status === 'completed' || current.status === 'renewed')) {
      updates[`series.${id}.status`] = 'planned'
    }
    await updateDoc(vaultRef, updates)
  }

  // Watched episodes store the real date they were marked watched (not just
  // `true`) so the Calendario page can show genuine history. Un-marking
  // always deletes the field regardless.
  async function toggleEpisode(id, season, episode, watched) {
    const current = seriesMap?.[id]
    const key = episodeKey(season, episode)
    const path = `series.${id}.watched.${key}`
    const today = dateKey(new Date())
    const newWatched = { ...(current?.watched ?? {}) }
    if (watched) newWatched[key] = today
    else delete newWatched[key]
    const statusUpdates = current ? autoStatusUpdates(current, id, newWatched) : {}
    await updateDoc(
      vaultRef,
      withUpdatedAt(id, { [path]: watched ? today : deleteField(), ...statusUpdates }),
    )
  }

  async function setSeasonWatched(id, season, episodeCount, watched) {
    const current = seriesMap?.[id]
    const today = dateKey(new Date())
    const newWatched = { ...(current?.watched ?? {}) }
    for (let ep = 1; ep <= episodeCount; ep++) {
      const key = episodeKey(season, ep)
      if (watched) newWatched[key] = today
      else delete newWatched[key]
    }
    const statusUpdates = current ? autoStatusUpdates(current, id, newWatched) : {}
    const updates = withUpdatedAt(id, statusUpdates)
    for (let ep = 1; ep <= episodeCount; ep++) {
      updates[`series.${id}.watched.${episodeKey(season, ep)}`] = watched
        ? today
        : deleteField()
    }
    await updateDoc(vaultRef, updates)
  }

  // Lets the Calendario page correct when an already-watched episode was
  // actually watched (e.g. logged a day late). Only meaningful for episodes
  // already marked watched; does not toggle watched state itself.
  async function setEpisodeWatchedDate(id, season, episode, newDateKey) {
    const path = `series.${id}.watched.${episodeKey(season, episode)}`
    await updateDoc(vaultRef, withUpdatedAt(id, { [path]: newDateKey }))
  }

  const value = {
    ready: seriesMap !== null,
    error,
    series,
    getSeries: (id) => seriesMap?.[id] ?? null,
    addSeries,
    removeSeries,
    setStatus,
    setLink,
    setWatchDays,
    setRating,
    refreshFromTmdb,
    toggleEpisode,
    setSeasonWatched,
    setEpisodeWatchedDate,
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
