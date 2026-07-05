// Plain vector icon, not the "↻" Unicode glyph — that character renders
// inconsistently (often noticeably smaller/thinner than other icon glyphs
// like "✕") depending on the device's font, so pixel-exact SVG sizing is
// used instead for reliable cross-device parity.
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
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <polyline points="21 3 21 9 15 9" />
    </svg>
  )
}
