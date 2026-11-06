import React, { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { X, Share2, Trophy, Calendar } from 'lucide-react'
import type { Tournament, TeamStandingsRow, Fixture } from '../../tournament/types'

interface TournamentShareCardModalProps {
  tournament: Tournament
  standings: TeamStandingsRow[]
  fixtures: Fixture[]
  teamsById: Record<string, string>
  onClose: () => void
}

export const TournamentShareCardModal: React.FC<TournamentShareCardModalProps> = ({
  tournament,
  standings,
  fixtures,
  teamsById,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const [cardType, setCardType] = useState<'standings' | 'fixtures'>('standings')
  const [isGenerating, setIsGenerating] = useState(false)

  const upcomingFixtures = fixtures.filter((f) => f.status === 'scheduled' || f.status === 'live').slice(0, 6)

  const handleShare = async () => {
    if (!cardRef.current) return
    setIsGenerating(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
      })
      const blob = await (await fetch(dataUrl)).blob()
      const fileName = `${tournament.name.replace(/\s+/g, '-')}-${cardType}.png`
      const file = new File([blob], fileName, { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${tournament.name} - ${cardType === 'standings' ? 'Points Table' : 'Fixtures'}`,
        })
      } else {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = fileName
        a.click()
      }
    } catch {
      // User cancelled
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[#121A1D] border border-[#233238] rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[94vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#233238]">
          <div className="flex gap-2">
            <button
              onClick={() => setCardType('standings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                cardType === 'standings'
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#182328] text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Points Table
            </button>
            <button
              onClick={() => setCardType('fixtures')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                cardType === 'fixtures'
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#182328] text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Fixtures
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Preview Container */}
        <div className="flex justify-center overflow-x-auto py-2">
          {/* Card element with exact 4:5 aspect ratio (1080x1350 scaled for preview) */}
          <div
            ref={cardRef}
            className="w-[360px] min-h-[450px] bg-gradient-to-b from-[#0F1E19] via-[#0D1619] to-[#080E10] border border-[#284036] rounded-2xl p-5 text-white shadow-2xl flex flex-col justify-between"
          >
            {/* Header */}
            <div>
              <div className="flex justify-between items-start border-b border-[#243B32] pb-3 mb-3">
                <div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50">
                    {tournament.format.replace('_', ' ').toUpperCase()}
                  </span>
                  <h1 className="text-lg font-black text-white mt-1 leading-tight tracking-wide">
                    {tournament.name}
                  </h1>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-mono block">PitchLog</span>
                  <span className="text-xs font-bold text-amber-400">
                    {cardType === 'standings' ? 'STANDINGS' : 'FIXTURES'}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              {cardType === 'standings' ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-12 text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 border-b border-white/10">
                    <span className="col-span-1 text-center">#</span>
                    <span className="col-span-5">Team</span>
                    <span className="col-span-1 text-center">P</span>
                    <span className="col-span-1 text-center">W</span>
                    <span className="col-span-1 text-center">L</span>
                    <span className="col-span-1 text-center font-bold text-amber-400">Pts</span>
                    <span className="col-span-2 text-right">NRR</span>
                  </div>

                  {standings.slice(0, 10).map((row, idx) => (
                    <div
                      key={row.teamId}
                      className={`grid grid-cols-12 items-center text-xs px-2 py-1.5 rounded-lg ${
                        idx < 4 ? 'bg-emerald-950/20' : 'bg-transparent'
                      }`}
                    >
                      <span className="col-span-1 text-center text-slate-400 font-bold">
                        {idx + 1}
                      </span>
                      <span className="col-span-5 font-bold truncate text-slate-100 pr-1">
                        {row.teamName}
                      </span>
                      <span className="col-span-1 text-center text-slate-400 font-mono">
                        {row.played}
                      </span>
                      <span className="col-span-1 text-center text-emerald-400 font-mono">
                        {row.won}
                      </span>
                      <span className="col-span-1 text-center text-rose-400 font-mono">
                        {row.lost}
                      </span>
                      <span className="col-span-1 text-center font-black text-amber-400 font-mono">
                        {row.points}
                      </span>
                      <span
                        className={`col-span-2 text-right font-mono text-[11px] font-semibold ${
                          row.nrr > 0
                            ? 'text-emerald-400'
                            : row.nrr < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                        }`}
                      >
                        {row.nrrText}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingFixtures.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      No upcoming fixtures scheduled.
                    </div>
                  ) : (
                    upcomingFixtures.map((f) => {
                      const t1 = f.homeTeamId ? teamsById[f.homeTeamId] ?? 'TBD' : 'TBD'
                      const t2 = f.awayTeamId ? teamsById[f.awayTeamId] ?? 'TBD' : 'TBD'
                      const roundName =
                        f.stage === 'league' || f.stage === 'group'
                          ? `Round ${f.round}`
                          : f.stage.replace('_', ' ').toUpperCase()
                      return (
                        <div
                          key={f.id}
                          className="bg-[#13201D] border border-[#233B32] p-2.5 rounded-xl flex flex-col gap-1"
                        >
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span className="font-semibold text-emerald-400">{roundName}</span>
                            <span className="uppercase text-[9px] bg-slate-800 px-1.5 py-0.5 rounded">
                              {f.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-bold text-slate-100">
                            <span className="truncate max-w-[130px]">{t1}</span>
                            <span className="text-[10px] text-amber-400 font-mono px-2">VS</span>
                            <span className="truncate max-w-[130px] text-right">{t2}</span>
                          </div>
                          {f.scheduledAt && (
                            <span className="text-[9px] text-slate-400">
                              {new Date(f.scheduledAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#243B32] pt-3 mt-4 flex justify-between items-center text-[10px] text-slate-400">
              <span>Scored on PitchLog</span>
              <span className="text-emerald-400 font-semibold font-mono">
                {tournament.oversPerInnings} Overs Match
              </span>
            </div>
          </div>
        </div>

        {/* Share Action */}
        <button
          onClick={handleShare}
          disabled={isGenerating}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-bold text-black flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] disabled:opacity-50"
        >
          {isGenerating ? (
            <span className="text-sm">Generating Image...</span>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span className="text-sm">Share / Save Card</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
