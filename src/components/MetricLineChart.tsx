import type { JournalEntry } from '../types'

interface DataPoint {
  date: string
  value: number
}

interface Props {
  entries: JournalEntry[]
  metricKey: string
}

function getPoints(entries: JournalEntry[], metricKey: string): DataPoint[] {
  return entries
    .filter((e) => e.metrics[metricKey] !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((e) => ({ date: e.date, value: e.metrics[metricKey] as number }))
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const W = 600
const H = 200
const PAD = { top: 20, right: 20, bottom: 40, left: 50 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

export default function MetricLineChart({ entries, metricKey }: Props) {
  const points = getPoints(entries, metricKey)

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-40 text-slate-500 text-sm"
        data-testid="no-metrics-message"
      >
        No metrics recorded yet
      </div>
    )
  }

  const values = points.map((p) => p.value)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const rangeV = maxV - minV || 1

  const scaleX = (i: number) =>
    points.length === 1
      ? PAD.left + INNER_W / 2
      : PAD.left + (i / (points.length - 1)) * INNER_W

  const scaleY = (v: number) =>
    PAD.top + ((maxV - v) / rangeV) * INNER_H

  const svgPoints = points.map((p, i) => `${scaleX(i)},${scaleY(p.value)}`)
  const polyline = svgPoints.join(' ')
  const areaPath =
    svgPoints.length > 0
      ? `M${scaleX(0)},${PAD.top + INNER_H} ` +
        svgPoints.map((p, i) => `${i === 0 ? 'L' : 'L'}${p}`).join(' ') +
        ` L${scaleX(points.length - 1)},${PAD.top + INNER_H} Z`
      : ''

  // Y-axis ticks
  const tickCount = 4
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const v = minV + (i / tickCount) * (maxV - minV)
    return { v, y: scaleY(v) }
  })

  // X-axis labels (show up to 6)
  const maxLabels = 6
  const labelStep = Math.ceil(points.length / maxLabels)
  const xLabels = points
    .map((p, i) => ({ ...p, i }))
    .filter((_, i) => i % labelStep === 0 || i === points.length - 1)

  const label = metricKey.charAt(0).toUpperCase() + metricKey.slice(1)

  return (
    <div className="w-full" data-testid="metric-chart">
      <p className="text-xs text-slate-400 mb-1 text-center font-medium">
        {label} over time
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 220 }}
        aria-label={`Line chart for ${label}`}
      >
        {/* Grid lines */}
        {yTicks.map(({ y }, i) => (
          <line
            key={i}
            x1={PAD.left}
            y1={y}
            x2={PAD.left + INNER_W}
            y2={y}
            stroke="#334155"
            strokeWidth={1}
          />
        ))}

        {/* Area fill */}
        {points.length > 1 && (
          <path d={areaPath} fill="#10B981" fillOpacity={0.1} />
        )}

        {/* Line */}
        {points.length > 1 && (
          <polyline
            points={polyline}
            fill="none"
            stroke="#10B981"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={scaleX(i)}
              cy={scaleY(p.value)}
              r={4}
              fill="#10B981"
              stroke="#0F172A"
              strokeWidth={2}
            />
            {/* Tooltip on hover via title */}
            <title>
              {formatDate(p.date)}: {p.value}
            </title>
          </g>
        ))}

        {/* Y-axis labels */}
        {yTicks.map(({ v, y }, i) => (
          <text
            key={i}
            x={PAD.left - 8}
            y={y}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#94A3B8"
            fontSize={10}
          >
            {Number.isInteger(v) ? v : v.toFixed(1)}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabels.map(({ date, i }) => (
          <text
            key={i}
            x={scaleX(i)}
            y={PAD.top + INNER_H + 18}
            textAnchor="middle"
            fill="#94A3B8"
            fontSize={10}
          >
            {formatDate(date)}
          </text>
        ))}

        {/* Axes */}
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + INNER_H}
          stroke="#475569"
          strokeWidth={1}
        />
        <line
          x1={PAD.left}
          y1={PAD.top + INNER_H}
          x2={PAD.left + INNER_W}
          y2={PAD.top + INNER_H}
          stroke="#475569"
          strokeWidth={1}
        />
      </svg>
    </div>
  )
}
