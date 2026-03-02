interface Props {
  data: number[]
  width?: number
  height?: number
  color?: string
}

export default function Sparkline({
  data,
  width = 80,
  height = 30,
  color = '#10B981',
}: Props) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height}>
        {data.length === 1 && (
          <circle cx={width / 2} cy={height / 2} r={2.5} fill={color} />
        )}
      </svg>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pad = 3
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2)
    const y = pad + ((max - v) / range) * (height - pad * 2)
    return `${x},${y}`
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ')

  return (
    <svg width={width} height={height}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={`${pathD} L${width - pad},${height} L${pad},${height} Z`}
        fill={color}
        fillOpacity={0.1}
      />
    </svg>
  )
}
