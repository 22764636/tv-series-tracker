export default function EmptyState({ title, hint }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
      <span className="text-3xl">📭</span>
      <p className="font-medium text-text">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
    </div>
  )
}
