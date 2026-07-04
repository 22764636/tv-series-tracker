// Single source of truth for weekday keys/labels, shared by the per-series
// watch-days picker (SeriesDetail) and the Calendario page.
export const WEEKDAYS = [
  { key: 'mon', label: 'Lun', jsDay: 1 },
  { key: 'tue', label: 'Mar', jsDay: 2 },
  { key: 'wed', label: 'Mer', jsDay: 3 },
  { key: 'thu', label: 'Gio', jsDay: 4 },
  { key: 'fri', label: 'Ven', jsDay: 5 },
  { key: 'sat', label: 'Sab', jsDay: 6 },
  { key: 'sun', label: 'Dom', jsDay: 0 },
]

function unwatchedEpisodesInOrder(series) {
  const list = []
  for (const season of series.seasons) {
    for (let ep = 1; ep <= season.episodeCount; ep++) {
      if (!series.watched?.[`S${season.number}E${ep}`]) {
        list.push({ season: season.number, episode: ep })
      }
    }
  }
  return list
}

// Calendar entries are derived, never stored: each call recomputes from
// today's date + each series' watchDays + remaining unwatched count. This is
// what makes a skipped watch day "keep counting" — the remaining count only
// drops once an episode is actually marked watched, so the projection simply
// shifts forward instead of the series falling off the calendar.
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
    cursor.setDate(cursor.getDate() + 1) // start from tomorrow, never today

    let found = 0
    let guard = 0
    while (found < unwatched.length && guard < 3650) {
      if (jsDays.has(cursor.getDay())) {
        entries.push({ date: new Date(cursor), series, episode: unwatched[found] })
        found++
      }
      cursor.setDate(cursor.getDate() + 1)
      guard++
    }
  }

  entries.sort((a, b) => a.date - b.date || a.series.title.localeCompare(b.series.title))
  return entries
}
