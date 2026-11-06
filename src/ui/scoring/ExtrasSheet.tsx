import React, { useState } from 'react'
import { X } from 'lucide-react'
import type { ExtraType } from '../../engine/types'
import type { AddBallParams } from '../../state/useMatch'

interface ExtrasSheetProps {
  initialType: ExtraType
  onClose: () => void
  onConfirm: (params: AddBallParams) => Promise<void>
}

export const ExtrasSheet: React.FC<ExtrasSheetProps> = ({
  initialType,
  onClose,
  onConfirm,
}) => {
  const [extraType, setExtraType] = useState<ExtraType>(initialType)
  const [wideExtraRuns, setWideExtraRuns] = useState<number>(0) // Additional runs beyond 1 wide
  const [noBallBatRuns, setNoBallBatRuns] = useState<number>(0)
  const [isBoundary4, setIsBoundary4] = useState<boolean>(false)
  const [isBoundary6, setIsBoundary6] = useState<boolean>(false)
  const [byeRuns, setByeRuns] = useState<number>(1)
  const [legByeRuns, setLegByeRuns] = useState<number>(1)

  const handleSubmit = async () => {
    if (extraType === 'wide') {
      await onConfirm({
        runsOffBat: 0,
        extra: { type: 'wide', runs: 1 + wideExtraRuns },
      })
    } else if (extraType === 'noball') {
      await onConfirm({
        runsOffBat: noBallBatRuns,
        extra: { type: 'noball', runs: 1 },
        isBoundary4,
        isBoundary6,
      })
    } else if (extraType === 'bye') {
      await onConfirm({
        runsOffBat: 0,
        extra: { type: 'bye', runs: byeRuns },
      })
    } else if (extraType === 'legbye') {
      await onConfirm({
        runsOffBat: 0,
        extra: { type: 'legbye', runs: legByeRuns },
      })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-[#121A1D] border-t border-[#233238] rounded-t-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#233238] pb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Record Extra
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab selector for extra type */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#0A0F11] rounded-xl border border-[#233238]">
          {(['wide', 'noball', 'bye', 'legbye'] as ExtraType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setExtraType(type)}
              className={`py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${
                extraType === type
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {type === 'noball' ? 'No Ball' : type === 'legbye' ? 'Leg Bye' : type}
            </button>
          ))}
        </div>

        {/* Wide specific options */}
        {extraType === 'wide' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300">
              Additional Runs (Byes / Overthrows on Wide):
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((extra) => (
                <button
                  key={extra}
                  type="button"
                  onClick={() => setWideExtraRuns(extra)}
                  className={`h-12 rounded-xl font-mono text-base font-bold border transition-all ${
                    wideExtraRuns === extra
                      ? 'bg-amber-500 text-black border-amber-400 font-extrabold'
                      : 'bg-[#182328] text-slate-200 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  +{extra}
                </button>
              ))}
            </div>
            <p className="text-xs text-amber-400 mt-1">
              Total: 1 (Wide) + {wideExtraRuns} = {1 + wideExtraRuns} runs
            </p>
          </div>
        )}

        {/* No-ball specific options */}
        {extraType === 'noball' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300">
              Runs Off Bat (credited to batter):
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4, 6].map((runs) => (
                <button
                  key={runs}
                  type="button"
                  onClick={() => {
                    setNoBallBatRuns(runs)
                    setIsBoundary4(runs === 4)
                    setIsBoundary6(runs === 6)
                  }}
                  className={`h-12 rounded-xl font-mono text-base font-bold border transition-all ${
                    noBallBatRuns === runs
                      ? 'bg-amber-500 text-black border-amber-400 font-extrabold'
                      : 'bg-[#182328] text-slate-200 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {runs}
                </button>
              ))}
            </div>
            <p className="text-xs text-emerald-400 mt-1">
              Total: 1 (No-ball) + {noBallBatRuns} (Bat) = {1 + noBallBatRuns} runs (Free Hit next!)
            </p>
          </div>
        )}

        {/* Bye specific options */}
        {extraType === 'bye' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300">
              Byes Completed:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((runs) => (
                <button
                  key={runs}
                  type="button"
                  onClick={() => setByeRuns(runs)}
                  className={`h-12 rounded-xl font-mono text-base font-bold border transition-all ${
                    byeRuns === runs
                      ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold'
                      : 'bg-[#182328] text-slate-200 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {runs}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Leg-bye specific options */}
        {extraType === 'legbye' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-300">
              Leg-Byes Completed:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((runs) => (
                <button
                  key={runs}
                  type="button"
                  onClick={() => setLegByeRuns(runs)}
                  className={`h-12 rounded-xl font-mono text-base font-bold border transition-all ${
                    legByeRuns === runs
                      ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold'
                      : 'bg-[#182328] text-slate-200 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {runs}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Confirm button */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full h-14 mt-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-base rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center"
        >
          Confirm Extra
        </button>
      </div>
    </div>
  )
}
