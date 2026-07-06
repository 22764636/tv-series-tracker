// Same icon family as SearchIcon.jsx/RefreshIcon.jsx (24x24 viewBox,
// stroke="currentColor", strokeWidth 2, round caps) instead of the Unicode
// "✕" glyph used previously. Mixing a hand-drawn refresh SVG with a
// font-rendered "✕" made the two icons in the same row look inconsistent
// (different weight/style), and the "✕" itself is exactly the kind of
// glyph whose rendering varies by device font. Used everywhere a close/
// remove/clear "X" action appears, for one consistent look app-wide.
export default function CloseIcon({ className = '', size = 16 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
