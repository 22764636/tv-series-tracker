export function episodeKey(season, episode) {
  return `S${season}E${episode}`
}

export function totalEpisodes(series) {
  return series.seasons.reduce((sum, s) => sum + s.episodeCount, 0)
}

export function watchedCount(series) {
  return Object.keys(series.watched ?? {}).length
}

export function progressRatio(series) {
  const total = totalEpisodes(series)
  return total ? watchedCount(series) / total : 0
}

export function nextEpisode(series) {
  for (const season of series.seasons) {
    for (let ep = 1; ep <= season.episodeCount; ep++) {
      if (!series.watched?.[episodeKey(season.number, ep)]) {
        return { season: season.number, episode: ep }
      }
    }
  }
  return null
}

export const STATUS_META = {
  watching: { label: 'In corso', color: 'accent' },
  planned: { label: 'Da vedere', color: 'muted' },
  completed: { label: 'Completata', color: 'success' },
  renewed: { label: 'In attesa di nuova stagione', color: 'accent' },
  dropped: { label: 'Abbandonata', color: 'danger' },
}

// Final rating shown to the user: the average of the two per-person ratings
// (blue heart / purple heart). If only one has voted yet, that single value
// stands in as a provisional average until the other one votes too.
export function averageRating(series) {
  const { ratingBlue, ratingPurple } = series
  if (ratingBlue == null && ratingPurple == null) return null
  if (ratingBlue == null) return ratingPurple
  if (ratingPurple == null) return ratingBlue
  return (ratingBlue + ratingPurple) / 2
}

// Ratings are stored with up to 2 decimals; trims trailing zeros for display
// (8 instead of 8.00, 7.5 instead of 7.50) so it still reads as "a rating".
export function formatRating(value) {
  return Number(value.toFixed(2)).toString()
}

// The series-level total for one heart is the mean of that heart's ratings
// across every episode that has one — recomputed whenever an episode rating
// changes (see setEpisodeRating in VaultContext.jsx), and always wins over a
// manually-typed total. Returns null when no episode has that heart rated
// yet, so the manual value (if any) is left alone.
export function aggregateHeartRating(episodeRatings, heart) {
  const values = Object.values(episodeRatings ?? {})
    .map((r) => r?.[heart])
    .filter((v) => v != null)
  if (values.length === 0) return null
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  return Math.round(mean * 100) / 100
}

// Chronological (season/episode order) list of episodes that have at least
// one heart rated, each with both individual values and their average — feeds
// both the episode rating rows and the RatingChart.
export function episodeRatingChartData(series) {
  const data = []
  for (const season of series.seasons.slice().sort((a, b) => a.number - b.number)) {
    for (let ep = 1; ep <= season.episodeCount; ep++) {
      const key = episodeKey(season.number, ep)
      const r = series.episodeRatings?.[key]
      if (!r || (r.blue == null && r.purple == null)) continue
      const avg = r.blue != null && r.purple != null ? (r.blue + r.purple) / 2 : r.blue ?? r.purple
      data.push({ key, season: season.number, episode: ep, blue: r.blue ?? null, purple: r.purple ?? null, avg })
    }
  }
  return data
}
