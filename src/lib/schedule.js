import { episodeKey } from './progress'

// Single source of truth for weekday keys/labels, shared by the per-series
// watch-days picker (SeriesDetail) and the Calendario page. `label` (3-letter)
// is what Calendario's fixed 7-column header uses. `shortLabel`/`fullLabel`
// are only for WatchDaysRow, which has room to be more/less abbreviated
// depending on viewport — not used by Calendario.
export const WEEKDAYS = [
  { key: 'mon', label: 'Lun', shortLabel: 'L', fullLabel: 'Lunedì', jsDay: 1 },
  { key: 'tue', label: 'Mar', shortLabel: 'Ma', fullLabel: 'Martedì', jsDay: 2 },
  { key: 'wed', label: 'Mer', shortLabel: 'Me', fullLabel: 'Mercoledì', jsDay: 3 },
  { key: 'thu', label: 'Gio', shortLabel: 'G', fullLabel: 'Giovedì', jsDay: 4 },
  { key: 'fri', label: 'Ven', shortLabel: 'V', fullLabel: 'Venerdì', jsDay: 5 },
  { key: 'sat', label: 'Sab', shortLabel: 'S', fullLabel: 'Sabato', jsDay: 6 },
  { key: 'sun', label: 'Dom', shortLabel: 'D', fullLabel: 'Domenica', jsDay: 0 },
]

// Local-calendar-day key (YYYY-MM-DD). Deliberately NOT date.toISOString(),
// which converts to UTC first — near midnight that silently shifts the date
// by one day for any timezone that isn't UTC and would mis-group entries.
export function dateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Parses a "YYYY-MM-DD" key back into a local-midnight Date. Appending a
// bare time (no timezone suffix) is what makes JS parse it as local time
// instead of UTC, mirroring dateKey() above.
export function parseDateKey(key) {
  return new Date(`${key}T00:00:00`)
}

function unwatchedEpisodesInOrder(series) {
  const list = []
  for (const season of series.seasons) {
    for (let ep = 1; ep <= season.episodeCount; ep++) {
      if (!series.watched?.[episodeKey(season.number, ep)]) {
        list.push({ season: season.number, episode: ep })
      }
    }
  }
  return list
}

// Future entries are derived, never stored: each call recomputes from
// today's date + each series' watchDays + remaining unwatched count. This is
// what makes a skipped watch day "keep counting" — the remaining count only
// drops once an episode is actually marked watched, so the projection simply
// shifts forward instead of the series falling off the calendar. The scan
// includes today itself: a series scheduled today whose episode isn't marked
// watched yet must still show up on today's cell, not skip straight to its
// next occurrence (which, for a Sunday-only show checked on a Sunday, would
// otherwise jump a full week ahead).
export function upcomingCalendarEntries(seriesList, today = new Date()) {
  const entries = []

  for (const series of seriesList) {
    if (series.status === 'dropped') continue
    const days = series.watchDays ?? []
    if (days.length === 0) continue

    const unwatched = unwatchedEpisodesInOrder(series)
    if (unwatched.length === 0) continue

    const jsDays = new Set(
      days.map((key) => WEEKDAYS.find((w) => w.key === key)?.jsDay),
    )

    const cursor = new Date(today)
    cursor.setHours(0, 0, 0, 0)

    let found = 0
    let guard = 0
    while (found < unwatched.length && guard < 3650) {
      if (jsDays.has(cursor.getDay())) {
        entries.push({ date: new Date(cursor), series, episode: unwatched[found], watched: false })
        found++
      }
      cursor.setDate(cursor.getDate() + 1)
      guard++
    }
  }

  entries.sort((a, b) => a.date - b.date || a.series.title.localeCompare(b.series.title))
  return entries
}

// Real watch history: one entry per episode whose stored value is a
// "YYYY-MM-DD" watched-on date (see VaultContext.toggleEpisode /
// setSeasonWatched). Legacy `true` values from before dates were tracked are
// skipped here — they still count fine everywhere progress is computed by
// truthiness, they just can't be placed on a specific day in history.
const EPISODE_KEY_RE = /^S(\d+)E(\d+)$/

function watchedHistoryEntries(seriesList) {
  const entries = []
  for (const series of seriesList) {
    for (const [key, value] of Object.entries(series.watched ?? {})) {
      if (typeof value !== 'string') continue
      const match = EPISODE_KEY_RE.exec(key)
      if (!match) continue
      entries.push({
        date: parseDateKey(value),
        series,
        episode: { season: Number(match[1]), episode: Number(match[2]) },
        watched: true,
      })
    }
  }
  return entries
}

// Combined map of dateKey -> entries[], covering both real history (any day,
// past/today/edited-into-the-future) and the future projection (from
// tomorrow on). Used to populate the Calendario month grid.
export function calendarEntriesByDate(seriesList, today = new Date()) {
  const map = new Map()
  const add = (entry) => {
    const key = dateKey(entry.date)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(entry)
  }
  watchedHistoryEntries(seriesList).forEach(add)
  upcomingCalendarEntries(seriesList, today).forEach(add)
  for (const list of map.values()) {
    list.sort((a, b) => a.series.title.localeCompare(b.series.title))
  }
  return map
}
