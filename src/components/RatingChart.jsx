import { useRef, useState } from 'react'
import { formatRating } from '../lib/progress'

const HEIGHT = 260
const PAD_LEFT = 30
const PAD_RIGHT = 14
const PAD_TOP = 16
const PAD_BOTTOM = 28
const MIN_POINT_SPACING = 56
const Y_TICKS = [2, 4, 6, 8, 10]

// Responsive, dependency-free SVG line chart: blue heart / purple heart
// ratings per episode, plus their average. Colors come from --chart-blue/
// --chart-purple (index.css) — a categorical pair validated separately from
// the app's semantic UI palette (see the comment there). The average line is
// deliberately muted/dashed rather than a third hue: it's a derived value,
// not a third voter. Every value the tooltip shows is also plainly visible in
// the per-episode rows above (the "table view" for this chart).
export default function RatingChart({ data, totalBlue, totalPurple, totalAverage, className = '' }) {
  const [hoverIndex, setHoverIndex] = useState(null)
  const svgRef = useRef(null)

  const width = Math.max(280, PAD_LEFT + PAD_RIGHT + (data.length - 1) * MIN_POINT_SPACING)
  const plotWidth = width - PAD_LEFT - PAD_RIGHT
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

  function xFor(i) {
    return data.length <= 1 ? PAD_LEFT + plotWidth / 2 : PAD_LEFT + (i / (data.length - 1)) * plotWidth
  }
  function yFor(value) {
    return PAD_TOP + (1 - (value - 1) / 9) * plotHeight
  }

  function linePath(key) {
    const points = data
      .map((d, i) => (d[key] == null ? null : [xFor(i), yFor(d[key])]))
      .filter(Boolean)
    if (points.length === 0) return ''
    return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  }

  function updateHoverFromClientX(clientX) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const relX = ((clientX - rect.left) / rect.width) * width
    let nearest = 0
    let best = Infinity
    data.forEach((_, i) => {
      const dist = Math.abs(xFor(i) - relX)
      if (dist < best) {
        best = dist
        nearest = i
      }
    })
    setHoverIndex(nearest)
  }

  function handlePointerMove(e) {
    updateHoverFromClientX(e.clientX)
  }

  // Belt-and-braces alongside the pointer handlers above: touch-originated
  // pointer events aren't consistently delegated the same way mouse ones are
  // (confirmed with Playwright's touch emulation — the native DOM event
  // fires, but relying on pointerdown/pointermove alone missed it), so touch
  // gets its own explicit handler reading straight from the Touch API.
  function handleTouch(e) {
    const touch = e.touches[0] ?? e.changedTouches[0]
    if (touch) updateHoverFromClientX(touch.clientX)
  }

  // Lifting a finger fires pointerleave too (touch has no persistent hover
  // state), which would otherwise immediately clear the tooltip we just set
  // from the touch handlers above — only a real mouse leaving the chart
  // should dismiss it.
  function handlePointerLeave(e) {
    if (e.pointerType !== 'touch') setHoverIndex(null)
  }

  // Label every episode if they fit with comfortable spacing, otherwise skip
  // some so ticks never collide — never render a label that would overlap.
  const maxLabels = Math.max(2, Math.floor(plotWidth / 50))
  const labelStep = Math.max(1, Math.ceil(data.length / maxLabels))

  const hovered = hoverIndex != null ? data[hoverIndex] : null

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: 'var(--chart-blue)' }} />
          <span className="text-text">
            💙{totalBlue != null && <> {formatRating(totalBlue)}/10</>}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: 'var(--chart-purple)' }} />
          <span className="text-text">
            💜{totalPurple != null && <> {formatRating(totalPurple)}/10</>}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded-full"
            style={{ background: 'var(--color-muted)', backgroundImage: 'repeating-linear-gradient(90deg, var(--color-muted) 0 4px, transparent 4px 7px)' }}
          />
          <span className="text-muted">
            Media{totalAverage != null && <> {formatRating(totalAverage)}/10</>}
          </span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="block"
          style={{ width: '100%', minWidth: width, height: 'auto', touchAction: 'pan-y' }}
          onPointerDown={handlePointerMove}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
        >
          {Y_TICKS.map((t) => (
            <g key={t}>
              <line
                x1={PAD_LEFT}
                x2={width - PAD_RIGHT}
                y1={yFor(t)}
                y2={yFor(t)}
                stroke="var(--color-border)"
                strokeWidth="1"
              />
              <text x={PAD_LEFT - 6} y={yFor(t)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="var(--color-muted)">
                {t}
              </text>
            </g>
          ))}

          {data.map((d, i) =>
            i % labelStep === 0 ? (
              <text
                key={d.key}
                x={xFor(i)}
                y={HEIGHT - PAD_BOTTOM + 14}
                textAnchor="middle"
                fontSize="9"
                fill="var(--color-muted)"
              >
                {d.key}
              </text>
            ) : null,
          )}

          {hoverIndex != null && (
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--color-border)"
              strokeWidth="1"
            />
          )}

          <path
            d={linePath('avg')}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />
          <path d={linePath('blue')} fill="none" stroke="var(--chart-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={linePath('purple')} fill="none" stroke="var(--chart-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {data.map((d, i) => (
            <g key={d.key}>
              {d.blue != null && (
                <circle cx={xFor(i)} cy={yFor(d.blue)} r="4" fill="var(--chart-blue)" stroke="var(--color-surface)" strokeWidth="2" />
              )}
              {d.purple != null && (
                <circle cx={xFor(i)} cy={yFor(d.purple)} r="4" fill="var(--chart-purple)" stroke="var(--color-surface)" strokeWidth="2" />
              )}
            </g>
          ))}

          {/* Transparent hit strip, one per point, at least 24px wide per the
              interaction spec — pointermove above finds the nearest anyway,
              this just guarantees a minimum touch target. */}
          {data.map((_, i) => (
            <rect
              key={i}
              x={xFor(i) - Math.min(24, MIN_POINT_SPACING) / 2}
              y={PAD_TOP}
              width={Math.min(24, MIN_POINT_SPACING)}
              height={plotHeight}
              fill="transparent"
            />
          ))}
        </svg>
      </div>

      {hovered && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs">
          <span className="font-medium text-text">{hovered.key}</span>
          {hovered.blue != null && (
            <span className="text-muted">
              💙 <strong className="text-text">{formatRating(hovered.blue)}</strong>
            </span>
          )}
          {hovered.purple != null && (
            <span className="text-muted">
              💜 <strong className="text-text">{formatRating(hovered.purple)}</strong>
            </span>
          )}
          <span className="text-muted">
            Media <strong className="text-text">{formatRating(hovered.avg)}</strong>
          </span>
        </div>
      )}
    </div>
  )
}
