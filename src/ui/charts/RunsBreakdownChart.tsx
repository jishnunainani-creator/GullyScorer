import React from 'react'
import type { BallEvent } from '../../engine/types'

interface RunsBreakdownChartProps {
  events: BallEvent[]
  inningsNo?: number
}

export const RunsBreakdownChart: React.FC<RunsBreakdownChartProps> = ({
  events,
  inningsNo,
}) => {
  const filtered = inningsNo ? events.filter((e) => e.inningsNo === inningsNo) : events

  let singlesRuns = 0
  let twosThreesRuns = 0
  let foursRuns = 0
  let sixesRuns = 0
  let extrasRuns = 0

  for (const e of filtered) {
    if (e.isBoundary4) {
      foursRuns += 4
    } else if (e.isBoundary6) {
      sixesRuns += 6
    } else if (e.runsOffBat === 1) {
      singlesRuns += 1
    } else if (e.runsOffBat === 2 || e.runsOffBat === 3) {
      twosThreesRuns += e.runsOffBat
    } else if (e.runsOffBat > 0) {
      twosThreesRuns += e.runsOffBat
    }

    if (e.extra) {
      extrasRuns += e.extra.runs
    }
  }

  const totalRuns = singlesRuns + twosThreesRuns + foursRuns + sixesRuns + extrasRuns
  if (totalRuns === 0) {
    return null
  }

  const segments = [
    { label: 'Singles', runs: singlesRuns, color: '#38BDF8', bg: 'bg-sky-400' },
    { label: '2s & 3s', runs: twosThreesRuns, color: '#818CF8', bg: 'bg-indigo-400' },
    { label: '4s', runs: foursRuns, color: '#34D399', bg: 'bg-emerald-400' },
    { label: '6s', runs: sixesRuns, color: '#F472B6', bg: 'bg-pink-400' },
    { label: 'Extras', runs: extrasRuns, color: '#FBBF24', bg: 'bg-amber-400' },
  ].filter((s) => s.runs > 0)

  return (
    <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Scoring Breakdown
        </span>
        <span className="text-xs font-mono font-bold text-emerald-400">
          {totalRuns} Total Runs
        </span>
      </div>

      {/* Stacked Proportional Bar */}
      <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-800/80">
        {segments.map((seg, idx) => {
          const pct = (seg.runs / totalRuns) * 100
          return (
            <div
              key={idx}
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
              title={`${seg.label}: ${seg.runs} runs (${pct.toFixed(1)}%)`}
              className="h-full transition-all"
            />
          )
        })}
      </div>

      {/* Grid of Segments */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
        {segments.map((seg, idx) => {
          const pct = ((seg.runs / totalRuns) * 100).toFixed(1)
          return (
            <div
              key={idx}
              className="p-2 bg-[#182328] rounded-xl border border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${seg.bg}`} />
                <span className="text-slate-300 font-medium">{seg.label}</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-white">{seg.runs}</span>
                <span className="text-[10px] text-slate-500 font-mono ml-1">({pct}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
