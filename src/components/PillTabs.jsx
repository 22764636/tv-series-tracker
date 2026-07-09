export const STATUS_TABS = [
  { key: 'all', label: 'Tutte' },
  { key: 'watching', label: 'In corso' },
  { key: 'planned', label: 'Da vedere' },
  { key: 'completed', label: 'Completate' },
  { key: 'renewed', label: 'In attesa' },
  { key: 'dropped', label: 'Abbandonate' },
]

// Generic horizontal-scroll pill-tab row (was StatusTabs, hardcoded to the
// status filter only) — reused as-is for the viewer filter in Home.jsx
// (tabs=VIEWER_TABS) so both filters look and behave identically instead of
// two near-duplicate components. `tabs` defaults to the status list so the
// original call site didn't need to change.
export default function PillTabs({ active, onChange, tabs = STATUS_TABS }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      {tabs.map((tab) => {
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
