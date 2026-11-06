import React from 'react'
import { Trophy, FileText, Share2, PlusCircle, Award } from 'lucide-react'
import type { MilestoneBadge } from '../../stats/types'

export interface PlayerMilestoneUnlock {
  playerName: string
  badge: MilestoneBadge
}

interface MatchEndModalProps {
  resultText: string
  newMilestones?: PlayerMilestoneUnlock[]
  onViewScorecard: () => void
  onShareImage: () => void
  onNewMatch: () => void
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  resultText,
  newMilestones,
  onViewScorecard,
  onShareImage,
  onNewMatch,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-[#121A1D] border border-[#233238] rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <Trophy size={32} />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Match Finished
          </span>
          <h2 className="text-2xl font-black text-white mt-1 leading-tight">
            {resultText}
          </h2>
        </div>

        {/* Celebratory Milestones */}
        {newMilestones && newMilestones.length > 0 && (
          <div className="w-full bg-[#182328] border border-amber-500/40 rounded-xl p-3 flex flex-col gap-2 text-left">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Award size={14} />
              <span>Milestones Unlocked!</span>
            </div>
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
              {newMilestones.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs bg-[#121A1D] px-2.5 py-1.5 rounded-lg border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{m.badge.icon}</span>
                    <span className="font-bold text-white truncate max-w-[120px]">{m.playerName}</span>
                  </div>
                  <span className="text-amber-400 font-medium text-[11px]">{m.badge.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="w-full flex flex-col gap-2.5 mt-1">
          <button
            type="button"
            onClick={onViewScorecard}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
          >
            <FileText size={18} />
            <span>View Full Scorecard</span>
          </button>

          <button
            type="button"
            onClick={onShareImage}
            className="w-full h-12 bg-[#182328] hover:bg-[#233238] text-white border border-slate-700 font-bold text-sm rounded-xl transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            <span>Share Scorecard Image</span>
          </button>

          <button
            type="button"
            onClick={onNewMatch}
            className="w-full h-12 bg-transparent hover:bg-slate-900 text-slate-400 hover:text-white font-semibold text-sm rounded-xl transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <PlusCircle size={18} />
            <span>Start New Match</span>
          </button>
        </div>
      </div>
    </div>
  )
}
