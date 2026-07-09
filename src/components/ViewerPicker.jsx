// 'Entrambi' (default, null) means shared/both — the only option before this
// field existed, so it's the safe default everywhere this picker appears.
// 💙/💜 reuse the same two emoji already used throughout the app for the two
// people's ratings (never introduced fresh here) — no new emoji, per the
// no-unrequested-emoji rule.
export const VIEWER_OPTIONS = [
  { value: null, label: 'Entrambi' },
  { value: 'blue', label: '💙' },
  { value: 'purple', label: '💜' },
]

// Reused as-is by AddSeriesModal (choosing at creation) and SeriesDetail
// (editing later) so both entry points look and behave identically. Same
// pill classes as the status-pill toggle (SeriesDetail's status row,
// design/style-guide.html) rather than a new visual pattern.
export default function ViewerPicker({ value, onChange, label }) {
  return (
    <div>
      {label && <p className="mb-1.5 text-sm font-medium text-text">{label}</p>}
      <div className="flex gap-2">
        {VIEWER_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              value === opt.value
                ? 'border-accent-solid bg-accent-solid text-white'
                : 'border-border text-muted hover:bg-surface-hover'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
