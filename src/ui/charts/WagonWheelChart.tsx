import React, { useState } from 'react'
import type { BallEvent, ShotZone } from '../../engine/types'

interface WagonWheelChartProps {
  events: BallEvent[]
  batterId?: string
  isLeftHanded?: boolean
}

// 8 radial zones: angle ranges from 12 o'clock (0°) clockwise
const ZONE_METADATA: Array<{
  zone: ShotZone
  rhbLabel: string
  lhbLabel: string
  startDeg: number
  endDeg: number
  centerDeg: number
}> = [
  { zone: 1, rhbLabel: 'Straight', lhbLabel: 'Straight', startDeg: 337.5, endDeg: 22.5, centerDeg: 0 },
  { zone: 2, rhbLabel: 'Cover', lhbLabel: 'Mid-Wkt', startDeg: 22.5, endDeg: 67.5, centerDeg: 45 },
  { zone: 3, rhbLabel: 'Point', lhbLabel: 'Sq Leg', startDeg: 67.5, endDeg: 112.5, centerDeg: 90 },
  { zone: 4, rhbLabel: '3rd Man', lhbLabel: 'Fine Leg', startDeg: 112.5, endDeg: 157.5, centerDeg: 135 },
  { zone: 5, rhbLabel: 'Fine Leg', lhbLabel: '3rd Man', startDeg: 157.5, endDeg: 202.5, centerDeg: 180 },
  { zone: 6, rhbLabel: 'Sq Leg', lhbLabel: 'Point', startDeg: 202.5, endDeg: 247.5, centerDeg: 225 },
  { zone: 7, rhbLabel: 'Mid-Wkt', lhbLabel: 'Cover', startDeg: 247.5, endDeg: 292.5, centerDeg: 270 },
  { zone: 8, rhbLabel: 'Long On', lhbLabel: 'Long On', startDeg: 292.5, endDeg: 337.5, centerDeg: 315 },
]

export const WagonWheelChart: React.FC<WagonWheelChartProps> = ({
  events,
  batterId,
  isLeftHanded = false,
}) => {
  const [filterType, setFilterType] = useState<'all' | '4s' | '6s'>('all')

  // Filter events
  const relevantEvents = events.filter((e) => {
    if (batterId && e.batterId !== batterId) return false
    if (!e.shot?.zone) return false
    if (filterType === '4s') return e.isBoundary4
    if (filterType === '6s') return e.isBoundary6
    return true
  })

  // Has any shot data?
  const totalShotsRecorded = events.filter(
    (e) => (!batterId || e.batterId === batterId) && Boolean(e.shot?.zone),
  ).length

  if (totalShotsRecorded === 0) {
    return (
      <div className="p-6 text-center bg-[#121A1D] border border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-xs text-slate-400 min-h-[220px]">
        <span className="text-xl">🏏</span>
        <p className="font-bold text-slate-300">Shot direction wasn't recorded for this match</p>
        <p className="text-[11px] text-slate-500">
          Enable the Compass icon during scoring to track 8-segment wagon wheels.
        </p>
      </div>
    )
  }

  // Aggregate runs per zone
  const zoneRuns: Record<ShotZone, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }
  const zoneCounts: Record<ShotZone, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 }

  for (const e of relevantEvents) {
    if (e.shot?.zone) {
      zoneRuns[e.shot.zone] += e.runsOffBat
      zoneCounts[e.shot.zone] += 1
    }
  }

  const maxZoneRuns = Math.max(1, ...Object.values(zoneRuns))
  const cx = 130
  const cy = 130
  const radius = 110

  // SVG pie wedge helper
  const createWedgePath = (startAngleDeg: number, endAngleDeg: number): string => {
    const startRad = (startAngleDeg - 90) * (Math.PI / 180)
    const endRad = (endAngleDeg - 90) * (Math.PI / 180)

    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)

    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`
  }

  return (
    <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col items-center gap-3">
      {/* Top Filter Buttons */}
      <div className="flex items-center justify-between w-full border-b border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Wagon Wheel {isLeftHanded && '(LHB)'}
        </span>
        <div className="flex gap-1">
          {(['all', '4s', '6s'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterType(mode)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                filterType === mode
                  ? 'bg-emerald-500 text-black'
                  : 'bg-[#182328] text-slate-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Wagon Wheel SVG Canvas */}
      <div className="relative w-[260px] h-[260px]">
        <svg
          width="260"
          height="260"
          viewBox="0 0 260 260"
          className="w-full h-full"
          aria-label="Wagon Wheel Field Diagram"
        >
          {/* Ground Boundary Circle */}
          <circle cx={cx} cy={cy} r={radius} fill="#0A0F11" stroke="#233238" strokeWidth="2" />

          {/* 30-yard Inner Circle */}
          <circle cx={cx} cy={cy} r={radius * 0.55} fill="none" stroke="#1A262B" strokeDasharray="3,3" />

          {/* Sector Wedges Shaded by Intensity */}
          {ZONE_METADATA.map((z) => {
            const runs = zoneRuns[z.zone]
            const intensity = runs > 0 ? 0.15 + (runs / maxZoneRuns) * 0.6 : 0.04
            const path = createWedgePath(z.startDeg, z.endDeg)

            return (
              <path
                key={z.zone}
                d={path}
                fill="#10B981"
                fillOpacity={intensity}
                stroke="#1A262B"
                strokeWidth="1"
              />
            )
          })}

          {/* Center Pitch */}
          <rect
            x={cx - 4}
            y={cy - 22}
            width="8"
            height="44"
            fill="#334155"
            rx="1"
          />

          {/* Zone Labels & Score Badges */}
          {ZONE_METADATA.map((z) => {
            const rad = (z.centerDeg - 90) * (Math.PI / 180)
            const labelR = radius * 0.76
            const lx = cx + labelR * Math.cos(rad)
            const ly = cy + labelR * Math.sin(rad)
            const label = isLeftHanded ? z.lhbLabel : z.rhbLabel
            const runs = zoneRuns[z.zone]

            return (
              <g key={`lbl-${z.zone}`}>
                <text
                  x={lx}
                  y={ly - 2}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="8"
                  fontWeight="bold"
                >
                  {label}
                </text>
                {runs > 0 && (
                  <text
                    x={lx}
                    y={ly + 8}
                    textAnchor="middle"
                    fill="#10B981"
                    fontSize="9"
                    fontWeight="900"
                    fontFamily="monospace"
                  >
                    {runs}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between w-full text-[11px] text-slate-400 font-mono px-1">
        <span>Shots: {relevantEvents.length}</span>
        <span>Runs in Zones: {Object.values(zoneRuns).reduce((a, b) => a + b, 0)}</span>
      </div>
    </div>
  )
}
