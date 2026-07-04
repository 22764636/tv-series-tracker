export default function ProgressBar({ ratio, className = '' }) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100)
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-border ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
