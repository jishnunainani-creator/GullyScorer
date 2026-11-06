import React, { useState } from 'react'
import { X, Info, ChevronDown, ChevronUp } from 'lucide-react'
import type { TeamStandingsRow } from '../../tournament/types'

interface TeamNrrAuditModalProps {
  row: TeamStandingsRow
  onClose: () => void
}

export const TeamNrrAuditModal: React.FC<TeamNrrAuditModalProps> = ({ row, onClose }) => {
  const [showRulesExplanation, setShowRulesExplanation] = useState(false)

  const nrrNum = row.nrr
  const nrrClass =
    nrrNum > 0 ? 'text-emerald-400' : nrrNum < 0 ? 'text-rose-400' : 'text-slate-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-[#121A1D] border border-[#233238] rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#233238]">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{row.teamName}</span>
              <span className={`text-base font-mono font-bold ${nrrClass}`}>
                ({row.nrrText} NRR)
              </span>
            </h2>
            <p className="text-xs text-slate-400">Net Run Rate (NRR) Audit & Breakdown</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formula Card */}
        <div className="bg-[#182328] rounded-2xl p-4 border border-[#28383F] flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Base-6 Formula Breakdown
          </span>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-[#0D1417] p-2.5 rounded-xl border border-[#233238]">
              <span className="text-[11px] text-slate-400 block">Batting Run Rate</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {row.runsFor} / {row.oversForString}
              </span>
              <span className="text-xs text-slate-500 block">
                = {row.oversForBalls > 0 ? (row.runsFor / (row.oversForBalls / 6)).toFixed(3) : '0.000'}
              </span>
            </div>
            <div className="bg-[#0D1417] p-2.5 rounded-xl border border-[#233238]">
              <span className="text-[11px] text-slate-400 block">Bowling Run Rate</span>
              <span className="text-sm font-bold text-rose-400 font-mono">
                {row.runsAgainst} / {row.oversAgainstString}
              </span>
              <span className="text-xs text-slate-500 block">
                = {row.oversAgainstBalls > 0 ? (row.runsAgainst / (row.oversAgainstBalls / 6)).toFixed(3) : '0.000'}
              </span>
            </div>
          </div>
          <div className="text-center pt-1 text-xs text-slate-300 font-mono">
            NRR = Batting Rate - Bowling Rate ={' '}
            <span className={`font-bold ${nrrClass}`}>{row.nrrText}</span>
          </div>
        </div>

        {/* Standings Record */}
        <div className="bg-[#182328] rounded-xl p-3 border border-[#28383F] flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Tournament Performance
          </span>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-[#0D1417] p-2 rounded-lg border border-[#233238]">
              <span className="text-[10px] text-slate-400 block">Matches</span>
              <span className="font-bold font-mono text-white">{row.played}</span>
            </div>
            <div className="bg-[#0D1417] p-2 rounded-lg border border-[#233238]">
              <span className="text-[10px] text-slate-400 block">Won / Lost</span>
              <span className="font-bold font-mono text-emerald-400">{row.won}</span>
              <span className="text-slate-500"> / </span>
              <span className="font-bold font-mono text-rose-400">{row.lost}</span>
            </div>
            <div className="bg-[#0D1417] p-2 rounded-lg border border-[#233238]">
              <span className="text-[10px] text-slate-400 block">Points</span>
              <span className="font-black font-mono text-amber-400 text-sm">{row.points}</span>
            </div>
            <div className="bg-[#0D1417] p-2 rounded-lg border border-[#233238]">
              <span className="text-[10px] text-slate-400 block">Rank</span>
              <span className="font-bold font-mono text-white">#{row.rank}</span>
            </div>
          </div>
        </div>

        {/* Explain NRR Collapsible */}
        <div className="border-t border-[#233238] pt-2">
          <button
            onClick={() => setShowRulesExplanation(!showRulesExplanation)}
            className="w-full flex items-center justify-between text-xs text-sky-400 hover:text-sky-300 py-1 transition"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              How is Net Run Rate calculated?
            </span>
            {showRulesExplanation ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showRulesExplanation && (
            <div className="mt-2 text-[11px] text-slate-400 bg-[#0D1417] p-3 rounded-xl border border-[#233238] space-y-2 leading-relaxed">
              <p>
                <strong className="text-white">1. Cumulative Sum-then-Divide:</strong> NRR is calculated across the whole tournament by dividing total runs scored by total overs faced, then subtracting total runs conceded divided by total overs bowled. It is{' '}
                <em className="text-amber-300">never</em> an average of per-match run rates.
              </p>
              <p>
                <strong className="text-white">2. All-Out Rule:</strong> If a team is dismissed (all out) before their quota ends, they are charged the full innings quota (e.g. 20.0 overs) to prevent an artificially inflated run rate.
              </p>
              <p>
                <strong className="text-white">3. Successful Chase:</strong> If a team chases a target, only the actual balls taken to reach the target are counted.
              </p>
              <p>
                <strong className="text-white">4. Super Overs:</strong> Super Over scores are excluded from official NRR calculations.
              </p>
              <p>
                <strong className="text-white">5. Base-6 Integer Overs:</strong> 18.3 overs means 18 full overs plus 3 balls (18.5 in decimal), avoiding decimal miscalculation.
              </p>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#233238] hover:bg-[#2d3f47] text-white text-xs font-semibold transition"
        >
          Close Breakdown
        </button>
      </div>
    </div>
  )
}
