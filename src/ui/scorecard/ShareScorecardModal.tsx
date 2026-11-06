import React, { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { X, Share2, Download, Copy, Check, Trophy } from 'lucide-react'
import type { UseMatchReturn } from '../../state/useMatch'

interface ShareScorecardModalProps {
  matchState: UseMatchReturn
  onClose: () => void
}

export const ShareScorecardModal: React.FC<ShareScorecardModalProps> = ({
  matchState,
  onClose,
}) => {
  const { match, innings1, innings2, teams, players, matchResult } = matchState
  const cardRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false)

  if (!match || !innings1) return null

  const team1 = teams[match.innings1BattingTeamId]?.name ?? 'Team 1'
  const team2 = teams[match.innings2BattingTeamId]?.name ?? 'Team 2'

  // Top scorer across the match
  const allBatterStats = [
    ...Object.values(innings1.batterStats),
    ...(innings2 ? Object.values(innings2.batterStats) : []),
  ]
  allBatterStats.sort((a, b) => b.runs - a.runs)
  const topBatter = allBatterStats[0]
  const topBatterName = topBatter ? players[topBatter.playerId]?.name : 'N/A'

  // Top bowler across the match
  const allBowlerStats = [
    ...Object.values(innings1.bowlerStats),
    ...(innings2 ? Object.values(innings2.bowlerStats) : []),
  ]
  allBowlerStats.sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)
  const topBowler = allBowlerStats[0]
  const topBowlerName = topBowler ? players[topBowler.playerId]?.name : 'N/A'

  // WhatsApp text summary generator
  const getWhatsAppSummary = () => {
    let text = `🏏 *PitchLog Match Summary*\n`
    text += `*${team1}* vs *${team2}*\n`
    text += `📅 ${new Date(match.date).toLocaleDateString()}\n\n`
    text += `1st Inn: *${team1}* - ${innings1.totalRuns}/${innings1.wickets} (${innings1.overs} ov)\n`
    if (innings2) {
      text += `2nd Inn: *${team2}* - ${innings2.totalRuns}/${innings2.wickets} (${innings2.overs} ov)\n`
    }
    if (matchResult) {
      text += `\n🏆 *Result:* ${matchResult}\n`
    }
    if (topBatter) {
      text += `⭐ *Top Scorer:* ${topBatterName} (${topBatter.runs} runs, ${topBatter.ballsFaced} balls)\n`
    }
    if (topBowler) {
      text += `🎯 *Top Bowler:* ${topBowlerName} (${topBowler.wickets}/${topBowler.runsConceded} in ${topBowler.overs} ov)\n`
    }
    text += `\nScored on PitchLog Cricket Scorer PWA`
    return text
  }

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(getWhatsAppSummary())
      setCopiedWhatsApp(true)
      setTimeout(() => setCopiedWhatsApp(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleShareOrDownload = async () => {
    if (!cardRef.current) return
    setIsGenerating(true)

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        cacheBust: true,
      })

      // Convert dataUrl to blob
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], `pitchlog-scorecard-${match.id}.png`, {
        type: 'image/png',
      })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'PitchLog Match Scorecard',
          text: matchResult ?? 'Match Scorecard from PitchLog',
        })
      } else {
        // Fallback: trigger direct PNG download
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `pitchlog-scorecard-${match.id}.png`
        a.click()
      }
    } catch {
      // Fallback: direct download
      try {
        if (cardRef.current) {
          const dataUrl = await toPng(cardRef.current)
          const a = document.createElement('a')
          a.href = dataUrl
          a.download = `pitchlog-scorecard-${match.id}.png`
          a.click()
        }
      } catch {
        // Silently fail if canvas fails in test env
      }
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-[#121A1D] border border-[#233238] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#233238] pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Share2 size={18} className="text-emerald-400" />
            <span>Share Match Scorecard</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* The 1080x1350 card scaled down for preview */}
        <div className="w-full flex justify-center bg-[#05080A] p-2 rounded-xl border border-slate-800">
          <div
            ref={cardRef}
            style={{ width: '360px', minHeight: '450px' }}
            className="bg-gradient-to-b from-[#0A1114] via-[#0E171B] to-[#080D0F] border border-[#1F2D33] rounded-2xl p-6 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden"
          >
            {/* Background glowing watermark */}
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

            {/* Card Header */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-mono font-black text-xs uppercase tracking-widest text-emerald-400">
                    PITCHLOG
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(match.date).toLocaleDateString()}
                </span>
              </div>

              <h2 className="text-xl font-black text-white mt-3 leading-tight tracking-tight">
                {team1} <span className="text-slate-500 font-light">vs</span> {team2}
              </h2>

              {matchResult && (
                <div className="mt-2.5 py-1.5 px-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                  <Trophy size={14} className="text-emerald-400 flex-shrink-0" />
                  <span>{matchResult}</span>
                </div>
              )}
            </div>

            {/* Scores summary */}
            <div className="my-4 p-3 bg-[#131D21]/90 border border-slate-800 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-bold text-slate-300 truncate max-w-[150px]">
                  {team1}
                </span>
                <span className="font-mono font-black text-sm text-white">
                  {innings1.totalRuns}/{innings1.wickets}{' '}
                  <span className="text-xs text-slate-500 font-normal">
                    ({innings1.overs} ov)
                  </span>
                </span>
              </div>

              {innings2 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 truncate max-w-[150px]">
                    {team2}
                  </span>
                  <span className="font-mono font-black text-sm text-white">
                    {innings2.totalRuns}/{innings2.wickets}{' '}
                    <span className="text-xs text-slate-500 font-normal">
                      ({innings2.overs} ov)
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Highlights: Top Scorer & Top Bowler */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {topBatter && (
                <div className="p-2.5 rounded-xl bg-[#131D21]/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Top Batter
                  </span>
                  <p className="font-bold text-white text-xs truncate mt-0.5">
                    {topBatterName}
                  </p>
                  <p className="font-mono text-emerald-400 font-bold text-xs">
                    {topBatter.runs} <span className="text-[10px] text-slate-400 font-normal">({topBatter.ballsFaced}b)</span>
                  </p>
                </div>
              )}

              {topBowler && (
                <div className="p-2.5 rounded-xl bg-[#131D21]/60 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Top Bowler
                  </span>
                  <p className="font-bold text-white text-xs truncate mt-0.5">
                    {topBowlerName}
                  </p>
                  <p className="font-mono text-rose-400 font-bold text-xs">
                    {topBowler.wickets}w <span className="text-[10px] text-slate-400 font-normal">({topBowler.runsConceded}r)</span>
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Gully Cricket Scorer</span>
              <span>pitchlog.app</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleShareOrDownload}
            className="w-full h-13 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
          >
            <Download size={18} />
            <span>{isGenerating ? 'Generating Image...' : 'Share / Download Image'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="w-full h-12 py-3 bg-[#182328] hover:bg-[#202E34] text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            {copiedWhatsApp ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            <span>{copiedWhatsApp ? 'Copied WhatsApp Summary!' : 'Copy WhatsApp Summary'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
