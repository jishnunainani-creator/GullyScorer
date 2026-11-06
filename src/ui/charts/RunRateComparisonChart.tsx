import React from 'react'

interface RunRateComparisonChartProps {
  crrByOver: number[]
  rrrByOver: number[]
}

export const RunRateComparisonChart: React.FC<RunRateComparisonChartProps> = ({
  crrByOver,
  rrrByOver,
}) => {
  if (crrByOver.length === 0) {
    return null
  }

  const totalPoints = Math.max(crrByOver.length, rrrByOver.length, 1)
  const maxRate = Math.max(
    12,
    ...crrByOver,
    ...rrrByOver.filter((r) => r !== Infinity && !isNaN(r)),
  )

  const chartHeight = 140
  const chartWidth = 320
  const padLeft = 32
  const padBottom = 24
  const padTop = 14
  const padRight = 16

  const plotW = chartWidth - padLeft - padRight
  const plotH = chartHeight - padTop - padBottom

  const getX = (i: number) => padLeft + (i / Math.max(1, totalPoints - 1)) * plotW
  const getY = (val: number) => {
    const clamped = Math.min(maxRate, Math.max(0, val))
    return padTop + plotH - (clamped / maxRate) * plotH
  }

  const crrPath = crrByOver
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(r)}`)
    .join(' ')

  const rrrPath = rrrByOver
    .filter((r) => r !== Infinity && !isNaN(r))
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(r)}`)
    .join(' ')

  return (
    <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
      {/* Header and Legend */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Run Rate Tracker (Chase)
        </span>
        <div className="flex items-center gap-3 text-[10px] font-mono font-bold">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-400">CRR</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="text-rose-400">RRR</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto flex justify-center">
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="overflow-visible"
        >
          {/* Horizontal Gridlines */}
          {[0, Math.round(maxRate / 2), Math.round(maxRate)].map((val, idx) => {
            const y = getY(val)
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={chartWidth - padRight}
                  y2={y}
                  stroke="#1E293B"
                  strokeDasharray="2,2"
                />
                <text
                  x={padLeft - 4}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748B"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            )
          })}

          {/* CRR Path */}
          {crrPath && (
            <path
              d={crrPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* RRR Path */}
          {rrrPath && (
            <path
              d={rrrPath}
              fill="none"
              stroke="#F43F5E"
              strokeWidth="2"
              strokeDasharray="3,3"
              strokeLinecap="round"
            />
          )}

          {/* X axis labels */}
          {Array.from({ length: totalPoints }).map((_, i) => (
            <text
              key={`x-${i}`}
              x={getX(i)}
              y={chartHeight - 6}
              textAnchor="middle"
              fill="#94A3B8"
              fontSize="9"
              fontFamily="monospace"
            >
              {i + 1}
            </text>
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
        <span>Required rate tightening</span>
        <span>Overs bowled in 2nd Inn</span>
      </div>
    </div>
  )
}
