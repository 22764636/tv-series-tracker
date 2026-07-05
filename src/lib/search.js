// Shared by the desktop header search and the mobile search modal, so
// "search the library by title" has exactly one implementation.
export function filterSeriesByTitle(series, query, limit = 8) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return series.filter((s) => s.title.toLowerCase().includes(q)).slice(0, limit)
}
