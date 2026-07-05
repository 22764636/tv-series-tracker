// Computed on the fly, never stored: a direct "guess" link to the Wikipedia
// article matching the series title. If the article doesn't exist under that
// exact title, Wikipedia's own search/redirect page still gets the user close
// enough — no TMDB/Wikipedia API call needed for this.
export function wikipediaUrl(title, lang) {
  const page = encodeURIComponent(title.trim().replace(/ /g, '_'))
  return `https://${lang}.wikipedia.org/wiki/${page}`
}
