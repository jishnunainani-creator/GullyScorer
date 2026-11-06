import React from 'react'

interface ManhattanChartProps {
  inn1RunsPerOver: number[]
  inn2RunsPerOver?: number[]
  inn1WicketsPerOver?: number[]
  inn2WicketsPerOver?: number[]
  team1Name?: string
  team2Name?: string
}

export const ManhattanChart: React.FC<ManhattanChartProps> = ({
  inn1RunsPerOver,
  inn2RunsPerOver = [],
  inn1WicketsPerOver = [],
  inn2WicketsPerOver = [],
  team1Name = 'Innings 1',
  team2Name = 'Innings 2',
}) => {
  const totalOvers = Math.max(inn1RunsPerOver.length, inn2RunsPerOver.length, 1)
  const maxRuns = Math.max(
    10,
    ...inn1RunsPerOver,
    ...inn2RunsPerOver,
  )

  const chartHeight = 160
  const chartWidth = 320
  const padLeft = 28
  const padBottom = 24
  const padTop = 16
  const padRight = 12

  const plotW = chartWidth - padLeft - padRight
  const plotH = chartHeight - padTop - padBottom

  const overSlotWidth = plotW / totalOvers
  const barWidth = Math.max(4, Math.min(14, (overSlotWidth - 6) / 2))

  return (
    <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
      {/* Header and Legend */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Manhattan (Runs per Over)
        </span>
        <div className="flex items-center gap-3 text-[10px] font-mono font-bold">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span className="text-slate-300 truncate max-w-[80px]">{team1Name}</span>
          </div>
          {inn2RunsPerOver.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-purple-500" />
              <span className="text-slate-300 truncate max-w-[80px]">{team2Name}</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="w-full overflow-x-auto flex justify-center">
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="overflow-visible"
        >
          {/* Horizontal gridlines */}
          {[0, Math.round(maxRuns / 2), maxRuns].map((val, idx) => {
            const y = padTop + plotH - (val / maxRuns) * plotH
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

          {/* Bars per over */}
          {Array.from({ length: totalOvers }).map((_, ovIdx) => {
            const r1 = inn1RunsPerOver[ovIdx] ?? 0
            const r2 = inn2RunsPerOver[ovIdx] ?? 0
            const w1 = inn1WicketsPerOver[ovIdx] ?? 0
            const w2 = inn2WicketsPerOver[ovIdx] ?? 0

            const h1 = (r1 / maxRuns) * plotH
            const h2 = (r2 / maxRuns) * plotH

            const slotCenterX = padLeft + ovIdx * overSlotWidth + overSlotWidth / 2
            const x1 = slotCenterX - barWidth - 1
            const x2 = slotCenterX + 1
            const y1 = padTop + plotH - h1
            const y2 = padTop + plotH - h2

            return (
              <g key={ovIdx}>
                {/* Innings 1 Bar */}
                {r1 > 0 && (
                  <rect
                    x={x1}
                    y={y1}
                    width={barWidth}
                    height={h1}
                    fill="#10B981"
                    rx="2"
                  />
                )}

                {/* Wicket dot on inn1 */}
                {w1 > 0 && (
                  <circle
                    cx={x1 + barWidth / 2}
                    cy={Math.max(padTop + 4, y1 - 4)}
                    r="3"
                    fill="#F43F5E"
                  />
                )}

                {/* Innings 2 Bar */}
                {inn2RunsPerOver.length > 0 && r2 > 0 && (
                  <rect
                    x={x2}
                    y={y2}
                    width={barWidth}
                    height={h2}
                    fill="#A855F7"
                    rx="2"
                  />
                )}

                {/* Wicket dot on inn2 */}
                {inn2RunsPerOver.length > 0 && w2 > 0 && (
                  <circle
                    cx={x2 + barWidth / 2}
                    cy={Math.max(padTop + 4, y2 - 4)}
                    r="3"
                    fill="#F43F5E"
                  />
                )}

                {/* Over number on X axis */}
                <text
                  x={slotCenterX}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {ovIdx + 1}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
        <span>Red dot indicates wicket(s)</span>
        <span>Overs: 1 to {totalOvers}</span>
      </div>
    </div>
  )
}
