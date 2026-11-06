import React, { useState } from 'react'
import type { Innings, Player, Team } from '../../engine/types'

interface InningsBreakModalProps {
  innings1: Innings
  team1: Team
  team2: Team
  team2Players: Player[]
  team1Players: Player[]
  onStartInnings2: (openers: {
    strikerId: string
    nonStrikerId: string
    bowlerId: string
  }) => Promise<void>
}

export const InningsBreakModal: React.FC<InningsBreakModalProps> = ({
  innings1,
  team1,
  team2,
  team2Players,
  team1Players,
  onStartInnings2,
}) => {
  const [strikerId, setStrikerId] = useState<string>(team2Players[0]?.id ?? '')
  const [nonStrikerId, setNonStrikerId] = useState<string>(team2Players[1]?.id ?? '')
  const [bowlerId, setBowlerId] = useState<string>(team1Players[0]?.id ?? '')

  const target = innings1.totalRuns + 1

  const handleStart = async () => {
    if (!strikerId || !nonStrikerId || !bowlerId) return
    if (strikerId === nonStrikerId) return
    await onStartInnings2({ strikerId, nonStrikerId, bowlerId })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-[#121A1D] border border-[#233238] rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
        <div className="text-center border-b border-[#233238] pb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Innings Break
          </span>
          <h2 className="text-2xl font-black text-white mt-1">
            {team1.name} Scored {innings1.totalRuns}/{innings1.wickets}
          </h2>
          <p className="text-sm font-bold text-amber-400 mt-1">
            Target for {team2.name}: {target} runs
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Select 2nd Innings Openers
          </h4>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Opening Striker ({team2.name})
            </label>
            <select
              value={strikerId}
              onChange={(e) => setStrikerId(e.target.value)}
              className="w-full h-11 bg-[#182328] border border-slate-700 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {team2Players.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === nonStrikerId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Non-Striker ({team2.name})
            </label>
            <select
              value={nonStrikerId}
              onChange={(e) => setNonStrikerId(e.target.value)}
              className="w-full h-11 bg-[#182328] border border-slate-700 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {team2Players.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === strikerId}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">
              Opening Bowler ({team1.name})
            </label>
            <select
              value={bowlerId}
              onChange={(e) => setBowlerId(e.target.value)}
              className="w-full h-11 bg-[#182328] border border-slate-700 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {team1Players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          disabled={!strikerId || !nonStrikerId || !bowlerId || strikerId === nonStrikerId}
          onClick={handleStart}
          className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-base rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center mt-2 disabled:opacity-50"
        >
          Start 2nd Innings
        </button>
      </div>
    </div>
  )
}
