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
  dropped: { label: 'Abbandonata', color: 'danger' },
}
