import { useCallback, useEffect, useRef, useState } from 'react'
import { formatRating } from '../lib/progress'

const HEIGHT = 260
const PAD_LEFT = 30
const PAD_RIGHT = 14
const PAD_TOP = 16
const PAD_BOTTOM = 28
const MIN_POINT_SPACING = 56
const Y_TICKS = [2, 4, 6, 8, 10]
const ZOOM_MIN = 0.6
const ZOOM_MAX = 2
const ZOOM_STEP = 0.2

// Responsive, dependency-free SVG line chart: blue heart / purple heart
// ratings per episode, plus their average. Colors come from --chart-blue/
// --chart-purple (index.css) — a categorical pair validated separately from
// the app's semantic UI palette (see the comment there). The average line is
// deliberately muted/dashed rather than a third hue: it's a derived value,
// not a third voter. Every value the tooltip shows is also plainly visible in
// the per-episode rows above (the "table view" for this chart).
export default function RatingChart({ data, totalBlue, totalPurple, totalAverage, className = '' }) {
  const [hoverIndex, setHoverIndex] = useState(null)
  const [zoom, setZoom] = useState(1)
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Measured so the chart can actually fill the card (reactive to whatever
  // space it's given) instead of always sitting at its bare minimum content
  // width, which — even after the "don't stretch a fixed viewBox" fix below
  // — left a short chart looking clipped/cramped in a corner of a much wider
  // card. containerWidth only matters as a floor: once there are enough
  // points (or enough zoom) that they need more room than the container
  // has, width grows past it and overflow-x-auto takes over with a scroll
  // instead of cramming everything in.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setContainerWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const neededWidth = PAD_LEFT + PAD_RIGHT + (data.length - 1) * MIN_POINT_SPACING * zoom
  const width = Math.max(280, containerWidth, neededWidth)
  const plotWidth = width - PAD_LEFT - PAD_RIGHT
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

  // useCallback'd (not a plain function) so updateHoverFromClientX below —
  // and, transitively, the wheel/touch effect further down — can list it as
  // a dependency without also re-running on every unrelated render.
  const xFor = useCallback(
    (i) => (data.length <= 1 ? PAD_LEFT + plotWidth / 2 : PAD_LEFT + (i / (data.length - 1)) * plotWidth),
    [data.length, plotWidth],
  )
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

  const updateHoverFromClientX = useCallback(
    (clientX) => {
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
    },
    [data, width, xFor],
  )

  function handlePointerMove(e) {
    updateHoverFromClientX(e.clientX)
  }

  function clampZoom(z) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100))
  }

  function touchDistance(touches) {
    const [a, b] = touches
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }

  // { distance, zoom } captured at the start of a two-finger touch, so scale
  // is computed relative to that starting point rather than drifting
  // cumulatively from one touchmove event to the next.
  const pinchRef = useRef(null)

  // Wheel (desktop) and touch (mobile) zoom/crosshair are all attached as
  // native listeners with { passive: false } — NOT the JSX onWheel/onTouch*
  // props. React registers those as passive by default, so calling
  // preventDefault() inside them is silently ignored (logs "Unable to
  // preventDefault inside passive event listener invocation" instead of
  // throwing) rather than actually blocking the browser's default action.
  // That silent failure caused a real bug here: a wheel-zoom's preventDefault
  // did nothing, so the browser ALSO natively scrolled the chart horizontally
  // under the still-stationary pointer — meaning every subsequent wheel tick
  // landed over empty space instead of the SVG and did nothing at all. Same
  // risk for pinch (the browser's native page-zoom would otherwise kick in
  // alongside our own). Effect re-runs on zoom/width/data changes so the
  // closures below always see current values — `pinchRef` (a ref, not
  // state) is what actually needs to survive across those re-attachments,
  // to keep tracking the same in-progress gesture.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    function onWheel(e) {
      e.preventDefault()
      setZoom((z) => clampZoom(z + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP)))
    }

    // Deliberately no touch-action restriction on the <svg> (bug fixed
    // separately): an earlier version set touch-action: pan-y specifically
    // so a vertical page-scroll gesture wouldn't get eaten while touching
    // the chart — but that also told the browser to treat horizontal
    // swipes as script-only, which blocked the ancestor overflow-x-auto
    // div's native horizontal scroll entirely (a real report: stuck unable
    // to see episodes beyond what fit in the initial viewport on a longer
    // season). Single-finger handling below never calls preventDefault, so
    // the default touch-action (both axes handled natively) already lets
    // the browser scroll each direction correctly on its own nearest
    // scrollable ancestor — horizontal here, vertical on the page — while
    // touchmove still updates the crosshair concurrently. A second finger
    // switches to pinch-zoom instead (preventDefault only in that branch).
    function onTouchStart(e) {
      if (e.touches.length === 2) {
        pinchRef.current = { distance: touchDistance(e.touches), zoom }
      } else {
        const touch = e.touches[0]
        if (touch) updateHoverFromClientX(touch.clientX)
      }
    }

    function onTouchMove(e) {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const scale = touchDistance(e.touches) / pinchRef.current.distance
        setZoom(clampZoom(pinchRef.current.zoom * scale))
        return
      }
      const touch = e.touches[0] ?? e.changedTouches[0]
      if (touch) updateHoverFromClientX(touch.clientX)
    }

    function onTouchEnd(e) {
      if (e.touches.length < 2) pinchRef.current = null
    }

    svg.addEventListener('wheel', onWheel, { passive: false })
    svg.addEventListener('touchstart', onTouchStart, { passive: false })
    svg.addEventListener('touchmove', onTouchMove, { passive: false })
    svg.addEventListener('touchend', onTouchEnd, { passive: false })
    return () => {
      svg.removeEventListener('wheel', onWheel)
      svg.removeEventListener('touchstart', onTouchStart)
      svg.removeEventListener('touchmove', onTouchMove)
      svg.removeEventListener('touchend', onTouchEnd)
    }
  }, [zoom, updateHoverFromClientX])

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
      <div className="flex flex-wrap items-center gap-3 text-xs sm:gap-4 sm:text-sm">
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

      {/* width fills containerWidth when there's room (reactive — a short
          chart no longer sits clipped in a corner of a much wider card), and
          only grows past it once more points (or more zoom) genuinely need
          more space, at which point overflow-x-auto scrolls instead of
          cramming. Either way the SVG's rendered pixel size always matches
          its viewBox exactly (no width:100% stretch), so "fixed" units —
          label font-size, dot radius, line thickness — always render at
          that literal pixel size regardless of point count or zoom: only
          the spacing between points changes, never how big any one element
          looks. Zoom is pinch (two-finger touchmove) or mouse wheel — no
          on-screen +/- buttons, which used to compete with the legend row
          for space on mobile and reintroduced the very wrap bug fixed here. */}
      <div ref={containerRef} className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="block"
          style={{ width, height: HEIGHT }}
          onPointerDown={handlePointerMove}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
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
