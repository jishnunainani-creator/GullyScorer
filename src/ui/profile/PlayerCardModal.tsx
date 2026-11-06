import React, { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { X, Share2, Download, Trophy } from 'lucide-react'
import type { PlayerRecord } from '../../db/schema'
import type { PlayerCareerStats, MilestoneBadge } from '../../stats/types'

interface PlayerCardModalProps {
  player: PlayerRecord
  career: PlayerCareerStats
  topBadge?: MilestoneBadge
  onClose: () => void
}

export const PlayerCardModal: React.FC<PlayerCardModalProps> = ({
  player,
  career,
  topBadge,
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
      const file = new File([blob], `${player.name}-PitchLog-Card.png`, {
        type: 'image/png',
      })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${player.name} - PitchLog Career Card`,
        })
      } else {
        // Fallback to direct download
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `${player.name}-PitchLog-Card.png`
        a.click()
      }
    } catch {
      // Ignore share cancellation
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!cardRef.current) return
    setIsGenerating(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${player.name}-PitchLog-Card.png`
      a.click()
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-[#121A1D] border border-[#233238] rounded-3xl p-4 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Player Career Card</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* 1080x1350 Rendered Card (4:5 Aspect Ratio) */}
        <div
          ref={cardRef}
          className="w-full aspect-[4/5] bg-gradient-to-b from-[#18262B] via-[#0E171A] to-[#080C0E] border-2 border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between shadow-2xl text-white relative overflow-hidden"
        >
          {/* Subtle Background Glow */}
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

          {/* Card Top: Branding & Role */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />
              <span className="text-xs font-mono font-black tracking-widest text-white uppercase">
                PITCHLOG
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase text-emerald-300">
              {career.role.replace('_', ' ')}
            </span>
          </div>

          {/* Card Center: Player Name & Primary Numbers */}
          <div className="flex flex-col gap-3 my-auto z-10">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                {player.name}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                {career.matchesCount} Matches • {career.mvpPoints} MVP Points
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-black/40 border border-slate-800 rounded-xl">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Runs</span>
                <span className="text-lg font-mono font-black text-white">{career.batting.runs}</span>
                <span className="text-[10px] text-emerald-400 block font-mono">
                  Avg: {career.batting.average ?? '—'} • SR: {career.batting.strikeRate}
                </span>
              </div>

              <div className="p-2.5 bg-black/40 border border-slate-800 rounded-xl">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Wickets</span>
                <span className="text-lg font-mono font-black text-white">{career.bowling.wickets}</span>
                <span className="text-[10px] text-purple-400 block font-mono">
                  Econ: {career.bowling.economy} • BBI: {career.bowling.bestFiguresDisplay}
                </span>
              </div>
            </div>

            {/* Top Badge Earned */}
            {topBadge && (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2">
                <span className="text-xl">{topBadge.icon}</span>
                <div>
                  <h4 className="text-xs font-bold text-emerald-300 leading-tight">
                    {topBadge.title}
                  </h4>
                  <p className="text-[10px] text-slate-400">{topBadge.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Card Bottom: Form sparkline and tagline */}
          <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-[9px] text-slate-500 font-mono z-10">
            <span>Official Gully & Club Player Card</span>
            <span>Verified by PitchLog</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleShare}
            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98"
          >
            <Share2 size={16} />
            <span>{isGenerating ? 'Exporting...' : 'Share Card'}</span>
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleDownload}
            className="px-4 py-3 bg-[#182328] hover:bg-[#202E34] text-white border border-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
          >
            <Download size={16} />
            <span>PNG</span>
          </button>
        </div>
      </div>
    </div>
  )
}
