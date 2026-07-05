const TABS = [
  { key: 'all', label: 'Tutte' },
  { key: 'watching', label: 'In corso' },
  { key: 'planned', label: 'Da vedere' },
  { key: 'completed', label: 'Completate' },
  { key: 'renewed', label: 'In attesa' },
  { key: 'dropped', label: 'Abbandonate' },
]

export default function StatusTabs({ active, onChange }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = tab.key === active
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-accent-solid text-white'
                : 'bg-surface text-muted hover:bg-surface-hover'
            } border border-border`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
