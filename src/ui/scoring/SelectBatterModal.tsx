import React, { useState } from 'react'
import type { Player } from '../../engine/types'

interface SelectBatterModalProps {
  availableBatters: Player[]
  onSelectBatter: (batterId: string) => void
}

export const SelectBatterModal: React.FC<SelectBatterModalProps> = ({
  availableBatters,
  onSelectBatter,
}) => {
  const [selectedId, setSelectedId] = useState<string>('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-[#121A1D] border border-[#233238] rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
            Wicket Fallen
          </span>
          <h3 className="text-xl font-black text-white mt-0.5">
            Select Next Batter
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Choose the incoming batter to take the crease.
          </p>
        </div>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {availableBatters.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => setSelectedId(player.id)}
              className={`py-3 px-4 rounded-xl text-left border flex items-center justify-between transition-all ${
                selectedId === player.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 font-bold'
                  : 'bg-[#182328] text-slate-200 border-slate-700 hover:border-slate-500'
              }`}
            >
              <span className="font-semibold text-sm">{player.name}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!selectedId}
          onClick={() => {
            if (selectedId) {
              onSelectBatter(selectedId)
            }
          }}
          className={`w-full h-14 rounded-xl font-extrabold text-base transition-all shadow-lg active:scale-98 flex items-center justify-center ${
            selectedId
              ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-950/40'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          Confirm Incoming Batter
        </button>
      </div>
    </div>
  )
}
