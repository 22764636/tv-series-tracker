// Classic two-arrow circular refresh icon (same family/weight as
// SearchIcon.jsx: 24x24 viewBox, stroke="currentColor", strokeWidth 2,
// round caps/joins) — replaces an earlier single-arc design the user found
// ugly and unbalanced at small sizes. Two symmetric arcs with their own
// arrowheads on opposite sides read as "refresh" far more clearly at a
// glance and match how this icon looks in most other apps.
export default function RefreshIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3.5 9a8.5 8.5 0 0 1 14-3.5L21 9" />
      <polyline points="21 3 21 9 15 9" />
      <path d="M20.5 15a8.5 8.5 0 0 1-14 3.5L3 15" />
      <polyline points="3 21 3 15 9 15" />
    </svg>
  )
}
