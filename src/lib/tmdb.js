const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'

const apiKey = import.meta.env.VITE_TMDB_API_KEY

export const tmdbConfigured = Boolean(apiKey)

export function posterUrl(posterPath) {
  return posterPath ? `${IMAGE_BASE}${posterPath}` : null
}

export async function searchShows(query) {
  if (!tmdbConfigured || !query.trim()) return []
  const url = `${API_BASE}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&include_adult=false`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Ricerca TMDB non riuscita')
  const data = await res.json()
  return (data.results ?? []).map((show) => ({
    tmdbId: show.id,
    title: show.name,
    year: show.first_air_date ? show.first_air_date.slice(0, 4) : null,
    posterPath: show.poster_path,
  }))
}

export async function getShowDetails(tmdbId) {
  const url = `${API_BASE}/tv/${tmdbId}?api_key=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Dettagli serie non trovati su TMDB')
  const data = await res.json()
  return {
    title: data.name,
    posterPath: data.poster_path,
    seasons: (data.seasons ?? [])
      .filter((s) => s.season_number > 0 && s.episode_count > 0)
      .map((s) => ({ number: s.season_number, episodeCount: s.episode_count })),
  }
}
