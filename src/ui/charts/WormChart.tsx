import React from 'react'

interface WormChartProps {
  inn1CumulativeRuns: number[]
  inn2CumulativeRuns?: number[]
  inn1WicketsPerOver?: number[]
  inn2WicketsPerOver?: number[]
  target?: number | null
  team1Name?: string
  team2Name?: string
}

export const WormChart: React.FC<WormChartProps> = ({
  inn1CumulativeRuns,
  inn2CumulativeRuns = [],
  inn1WicketsPerOver = [],
  inn2WicketsPerOver = [],
  target = null,
  team1Name = 'Innings 1',
  team2Name = 'Innings 2',
}) => {
  const c1 = [0, ...inn1CumulativeRuns]
  const c2 = inn2CumulativeRuns.length > 0 ? [0, ...inn2CumulativeRuns] : []
  const totalOvers = Math.max(inn1CumulativeRuns.length, inn2CumulativeRuns.length, 1)

  const maxVal = Math.max(
    15,
    target ?? 0,
    ...c1,
    ...c2,
  )

  const chartHeight = 160
  const chartWidth = 320
  const padLeft = 32
  const padBottom = 24
  const padTop = 16
  const padRight = 16

  const plotW = chartWidth - padLeft - padRight
  const plotH = chartHeight - padTop - padBottom

  const getX = (overIdx: number) => padLeft + (overIdx / totalOvers) * plotW
  const getY = (runs: number) => padTop + plotH - (runs / maxVal) * plotH

  const makePath = (cumArr: number[]) => {
    if (cumArr.length === 0) return ''
    return cumArr
      .map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(r)}`)
      .join(' ')
  }

  const p1Path = makePath(c1)
  const p2Path = makePath(c2)

  return (
    <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
      {/* Header and Legend */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Worm (Cumulative Runs)
        </span>
        <div className="flex items-center gap-3 text-[10px] font-mono font-bold">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300 truncate max-w-[80px]">{team1Name}</span>
          </div>
          {c2.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-slate-300 truncate max-w-[80px]">{team2Name}</span>
            </div>
          )}
          {target && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-0.5 bg-amber-400" />
              <span className="text-amber-400">Target ({target})</span>
            </div>
          )}
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
          {[0, Math.round(maxVal / 2), maxVal].map((val, idx) => {
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

          {/* Target Line if present */}
          {target && (
            <g>
              <line
                x1={padLeft}
                y1={getY(target)}
                x2={chartWidth - padRight}
                y2={getY(target)}
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeDasharray="4,3"
              />
            </g>
          )}

          {/* Innings 1 Curve */}
          {p1Path && (
            <path
              d={p1Path}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Innings 1 Wicket Dots */}
          {inn1WicketsPerOver.map((w, idx) => {
            if (w === 0) return null
            const r = c1[idx + 1] ?? 0
            return (
              <circle
                key={`w1-${idx}`}
                cx={getX(idx + 1)}
                cy={getY(r)}
                r="3.5"
                fill="#F43F5E"
                stroke="#080C0E"
                strokeWidth="1.5"
              />
            )
          })}

          {/* Innings 2 Curve */}
          {p2Path && (
            <path
              d={p2Path}
              fill="none"
              stroke="#A855F7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Innings 2 Wicket Dots */}
          {inn2WicketsPerOver.map((w, idx) => {
            if (w === 0) return null
            const r = c2[idx + 1] ?? 0
            return (
              <circle
                key={`w2-${idx}`}
                cx={getX(idx + 1)}
                cy={getY(r)}
                r="3.5"
                fill="#F43F5E"
                stroke="#080C0E"
                strokeWidth="1.5"
              />
            )
          })}

          {/* X-axis labels (overs) */}
          {Array.from({ length: totalOvers + 1 }).map((_, i) => {
            if (i === 0 || i % Math.max(1, Math.floor(totalOvers / 5)) === 0 || i === totalOvers) {
              return (
                <text
                  key={`ov-${i}`}
                  x={getX(i)}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {i}
                </text>
              )
            }
            return null
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
        <span>Dots mark fall of wickets</span>
        <span>Overs: 0 to {totalOvers}</span>
      </div>
    </div>
  )
}
