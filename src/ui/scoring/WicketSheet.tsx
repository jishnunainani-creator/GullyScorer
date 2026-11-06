import React, { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import type { WicketType, Player } from '../../engine/types'
import type { AddBallParams } from '../../state/useMatch'

interface WicketSheetProps {
  striker: Player | null
  nonStriker: Player | null
  battingPlayers: Player[]
  bowlingPlayers: Player[]
  outBatterIds: Set<string>
  isFreeHit: boolean
  lastManStands: boolean
  totalWicketsSoFar: number
  playersPerSide: number
  onClose: () => void
  onConfirm: (params: AddBallParams, nextBatterId?: string) => Promise<void>
}

export const WicketSheet: React.FC<WicketSheetProps> = ({
  striker,
  nonStriker,
  battingPlayers,
  bowlingPlayers,
  outBatterIds,
  isFreeHit,
  lastManStands,
  totalWicketsSoFar,
  playersPerSide,
  onClose,
  onConfirm,
}) => {
  const [wicketType, setWicketType] = useState<WicketType>('bowled')
  const [playerOutId, setPlayerOutId] = useState<string>(striker?.id ?? '')
  const [fielderId, setFielderId] = useState<string>('')
  const [runsCompleted, setRunsCompleted] = useState<number>(0)
  const [nextBatterId, setNextBatterId] = useState<string>('')

  // If free hit is active, default to runout
  React.useEffect(() => {
    if (isFreeHit && wicketType !== 'runout' && wicketType !== 'retired') {
      setWicketType('runout')
    }
  }, [isFreeHit, wicketType])

  // Available incoming batters (those who haven't batted or been out yet)
  const availableNextBatters = battingPlayers.filter(
    (p) =>
      p.id !== striker?.id &&
      p.id !== nonStriker?.id &&
      !outBatterIds.has(p.id),
  )

  // Check if this wicket makes the team all out or triggers LMS lone batter
  const wicketsAfterThis = totalWicketsSoFar + 1
  const maxWickets = lastManStands ? playersPerSide : playersPerSide - 1
  const willBeAllOut = wicketsAfterThis >= maxWickets
  const willBeLmsLone = lastManStands && wicketsAfterThis === playersPerSide - 1

  const handleSubmit = async () => {
    await onConfirm(
      {
        runsOffBat: runsCompleted,
        wicket: {
          type: wicketType,
          playerOutId,
          fielderId: fielderId || undefined,
        },
      },
      nextBatterId || undefined,
    )
    onClose()
  }

  const allowedTypes: WicketType[] = isFreeHit
    ? ['runout', 'retired']
    : ['bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket', 'retired']

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-[#121A1D] border-t border-[#233238] rounded-t-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#233238] pb-3">
          <h3 className="text-lg font-bold text-rose-500 flex items-center gap-2">
            Record Wicket
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {isFreeHit && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-semibold">
            <AlertCircle size={16} />
            <span>Free Hit Active! Only Run Out and Retired are valid dismissals.</span>
          </div>
        )}

        {/* Wicket Type selection */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
            Dismissal Type:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {allowedTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setWicketType(type)}
                className={`py-2.5 px-1 text-xs font-bold rounded-xl uppercase tracking-wider border transition-all ${
                  wicketType === type
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md font-extrabold'
                    : 'bg-[#182328] text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {type === 'runout' ? 'Run Out' : type === 'hitwicket' ? 'Hit Wkt' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Player Out selection (crucial for Run Out) */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
            Who is Out?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {striker && (
              <button
                type="button"
                onClick={() => setPlayerOutId(striker.id)}
                className={`py-3 px-3 text-xs font-bold rounded-xl border text-left flex flex-col transition-all ${
                  playerOutId === striker.id
                    ? 'bg-rose-900/40 text-rose-300 border-rose-500 font-extrabold'
                    : 'bg-[#182328] text-slate-300 border-slate-700'
                }`}
              >
                <span className="text-white text-sm">{striker.name}</span>
                <span className="text-slate-400 text-[10px]">Striker</span>
              </button>
            )}

            {nonStriker && (
              <button
                type="button"
                onClick={() => setPlayerOutId(nonStriker.id)}
                className={`py-3 px-3 text-xs font-bold rounded-xl border text-left flex flex-col transition-all ${
                  playerOutId === nonStriker.id
                    ? 'bg-rose-900/40 text-rose-300 border-rose-500 font-extrabold'
                    : 'bg-[#182328] text-slate-300 border-slate-700'
                }`}
              >
                <span className="text-white text-sm">{nonStriker.name}</span>
                <span className="text-slate-400 text-[10px]">Non-Striker</span>
              </button>
            )}
          </div>
        </div>

        {/* Runs completed before dismissal (for Run Out) */}
        {wicketType === 'runout' && (
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Runs Completed Before Run Out:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRunsCompleted(r)}
                  className={`h-11 rounded-xl font-mono text-base font-bold border transition-all ${
                    runsCompleted === r
                      ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold'
                      : 'bg-[#182328] text-slate-200 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fielder selection (for Caught, Run Out, Stumped) */}
        {(wicketType === 'caught' || wicketType === 'runout' || wicketType === 'stumped') && (
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Fielder Involved (Optional):
            </label>
            <select
              value={fielderId}
              onChange={(e) => setFielderId(e.target.value)}
              className="w-full h-12 bg-[#182328] border border-slate-700 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">None / Unassisted</option>
              {bowlingPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Next Batter selection */}
        {!willBeAllOut && !willBeLmsLone && availableNextBatters.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Next Batter:
            </label>
            <select
              value={nextBatterId}
              onChange={(e) => setNextBatterId(e.target.value)}
              className="w-full h-12 bg-[#182328] border border-slate-700 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select incoming batter...</option>
              {availableNextBatters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {willBeLmsLone && (
          <p className="text-xs text-amber-400 font-semibold bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
            Last Man Stands! The surviving batter will now bat alone until dismissed.
          </p>
        )}

        {willBeAllOut && (
          <p className="text-xs text-rose-400 font-semibold bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
            Innings All Out! This wicket ends the innings.
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full h-14 mt-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-base rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center"
        >
          Confirm Wicket
        </button>
      </div>
    </div>
  )
}
