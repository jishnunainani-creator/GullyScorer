import React, { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { X, Share2, Trophy } from 'lucide-react'
import type { MvpBreakdown } from '../../stats/types'
import type { MatchRecord } from '../../db/schema'

interface MatchMvpCardModalProps {
  mvp: MvpBreakdown
  playerName: string
  match: MatchRecord
  team1Name: string
  team2Name: string
  onClose: () => void
}

export const MatchMvpCardModal: React.FC<MatchMvpCardModalProps> = ({
  mvp,
  playerName,
  match,
  team1Name,
  team2Name,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleShare = async () => {
    if (!cardRef.current) return
    setIsGenerating(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
      })
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `${playerName}-MVP-Card.png`, {
        type: 'image/png',
      })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Player of the Match: ${playerName}`,
        })
      } else {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${playerName}-MVP-Card.png`
        a.click()
      }
    } catch {
      // Cancelled
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-[#121A1D] border border-[#233238] rounded-3xl p-4 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white">Player of the Match</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* 1080x1350 Aspect Ratio Card */}
        <div
          ref={cardRef}
          className="w-full aspect-[4/5] bg-gradient-to-b from-[#1C1F16] via-[#101416] to-[#080C0E] border-2 border-amber-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-2xl text-white relative overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-amber-400" />
              <span className="text-xs font-mono font-black tracking-widest text-amber-400 uppercase">
                PLAYER OF THE MATCH
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {new Date(match.date).toLocaleDateString()}
            </span>
          </div>

          <div className="flex flex-col gap-3 my-auto">
            <div>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                {team1Name} vs {team2Name}
              </p>
              <h2 className="text-3xl font-black text-white tracking-tight mt-1">
                {playerName}
              </h2>
            </div>

            {/* Impact Highlights */}
            <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-amber-400 block">Match Impact</span>
                <span className="text-xl font-mono font-black text-white">
                  {mvp.totalPoints} PTS
                </span>
              </div>
              <div className="text-right text-xs font-mono font-bold text-slate-200">
                {mvp.runs > 0 && <p className="text-emerald-400">{mvp.runs} Runs</p>}
                {mvp.wickets > 0 && <p className="text-purple-400">{mvp.wickets} Wickets</p>}
                {(mvp.catches > 0 || mvp.runOuts > 0) && (
                  <p className="text-sky-400">
                    {mvp.catches + mvp.runOuts} Dismissals
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono">
            <span>PitchLog MVP Engine</span>
            <span>Verified Gully & Club Performance</span>
          </div>
        </div>

        <button
          type="button"
          disabled={isGenerating}
          onClick={handleShare}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98"
        >
          <Share2 size={16} />
          <span>{isGenerating ? 'Exporting...' : 'Share Match MVP Card'}</span>
        </button>
      </div>
    </div>
  )
}
