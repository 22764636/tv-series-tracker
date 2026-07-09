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

// Sum of durations for unwatched episodes with a known duration — episodes
// we don't have a duration for are simply excluded from the sum (not treated
// as 0), so this can undercount rather than ever overcount. Pass a season
// number to scope it to one season instead of the whole series; recomputed
// live every render, nothing persisted, same as progressRatio.
export function remainingMinutes(series, seasonNumber = null) {
  let total = 0
  for (const season of series.seasons) {
    if (seasonNumber != null && season.number !== seasonNumber) continue
    for (let ep = 1; ep <= season.episodeCount; ep++) {
      const key = episodeKey(season.number, ep)
      if (series.watched?.[key]) continue
      const duration = series.episodeDurations?.[key]
      if (duration != null) total += duration
    }
  }
  return total
}

// "3h 20min" / "45min". Callers should only render this when
// remainingMinutes() > 0 — it's 0 both when nothing's left to watch and when
// no durations are known yet, and hiding the line is the right call either
// way, so there's nothing to disambiguate here.
export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
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

// Same shape as episodeRatingChartData, but scoped to one season — feeds the
// RatingChart's "per season" filter mode.
export function seasonRatingChartData(series, seasonNumber) {
  return episodeRatingChartData(series).filter((d) => d.season === seasonNumber)
}

// Cross-season comparison for one episode number (e.g. every season's E2):
// one point per season that actually reaches that episode number and has it
// rated, keyed by season ("S1", "S2", ...) instead of by episode — feeds the
// RatingChart's "compare across seasons" filter mode. Seasons with fewer
// episodes than the requested number, or with that episode unrated, are
// simply skipped, same "exclude rather than assume 0" rule as elsewhere.
export function episodeAcrossSeasonsChartData(series, episodeNumber) {
  const data = []
  for (const season of series.seasons.slice().sort((a, b) => a.number - b.number)) {
    if (season.episodeCount < episodeNumber) continue
    const key = episodeKey(season.number, episodeNumber)
    const r = series.episodeRatings?.[key]
    if (!r || (r.blue == null && r.purple == null)) continue
    const avg = r.blue != null && r.purple != null ? (r.blue + r.purple) / 2 : r.blue ?? r.purple
    data.push({ key: `S${season.number}`, season: season.number, episode: episodeNumber, blue: r.blue ?? null, purple: r.purple ?? null, avg })
  }
  return data
}

// Sorted list of every episode number that has at least one rating somewhere
// in the series (regardless of season) — the options offered by the
// "compare across seasons" episode picker.
export function ratedEpisodeNumbers(series) {
  const numbers = new Set()
  for (const key of Object.keys(series.episodeRatings ?? {})) {
    const r = series.episodeRatings[key]
    if (r?.blue == null && r?.purple == null) continue
    const match = /^S\d+E(\d+)$/.exec(key)
    if (match) numbers.add(Number(match[1]))
  }
  return [...numbers].sort((a, b) => a - b)
}

// A series is shared by default (`series.viewer` unset) — both hearts apply,
// unchanged from before this field existed. Setting `viewer` to 'blue' or
// 'purple' marks it as watched solo by just that person: the other heart
// isn't merely empty, it's not applicable at all, so every rating surface
// (total, per-episode, chart) hides its controls for the other heart
// entirely rather than showing an empty/greyed-out one. Returns null for a
// shared series so callers can do `solo !== 'purple'` / `solo !== 'blue'` to
// decide whether to render a given heart's UI (true for both a shared
// series and the one it applies to).
export function soloViewer(series) {
  return series.viewer === 'blue' || series.viewer === 'purple' ? series.viewer : null
}

// The series-level total for one heart stops being manually editable once
// EVERY episode already has that heart rated — at that point the aggregate
// in aggregateHeartRating() is the only correct value and nothing will ever
// trigger a recompute again (there are no more episodes left to rate), so a
// manual edit would silently "stick" as a permanent override instead of the
// auto-computed value winning as intended. Before full completion, manual
// editing stays available (e.g. for a series added after the fact, watched
// before per-episode rating existed, with zero episode ratings at all).
export function heartFullyRated(series, heart) {
  const total = totalEpisodes(series)
  if (total === 0) return false
  const ratedCount = Object.values(series.episodeRatings ?? {}).filter((r) => r?.[heart] != null).length
  return ratedCount >= total
}
