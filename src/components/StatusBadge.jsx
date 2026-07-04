import { STATUS_META } from '../lib/progress'

// Tailwind needs literal class strings to detect them at build time, so we
// map each semantic color to a fixed pair of classes instead of interpolating.
const COLOR_CLASSES = {
  accent: 'bg-accent-soft text-accent',
  muted: 'bg-surface-hover text-muted',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
}

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status]
  if (!meta) return null
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_CLASSES[meta.color]}`}
    >
      {meta.label}
    </span>
  )
}
