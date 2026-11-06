import React, { useState } from 'react'
import { ArrowLeft, Share2, BarChart2 } from 'lucide-react'
import type { UseMatchReturn } from '../../state/useMatch'
import type { PlayerRecord } from '../../db/schema'
import { MatchAnalyticsView } from '../analytics/MatchAnalyticsView'

interface ScorecardViewProps {
  matchState: UseMatchReturn
  onBack: () => void
  onShare: () => void
}

export const ScorecardView: React.FC<ScorecardViewProps> = ({
  matchState,
  onBack,
  onShare,
}) => {
  const {
    match,
    innings1,
    innings2,
    currentInningsNo,
    teams,
    players,
    matchResult,
  } = matchState

  const [activeTab, setActiveTab] = useState<1 | 2 | 'analytics'>(
    currentInningsNo === 2 ? 2 : 1,
  )

  if (!match || !innings1) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#080C0E] text-slate-400 font-mono text-sm">
        No Scorecard Available
      </div>
    )
  }

  const selectedInnings = activeTab === 1 ? innings1 : innings2
  const battingTeamId =
    activeTab === 1
      ? match.innings1BattingTeamId
      : match.innings2BattingTeamId
  const bowlingTeamId =
    activeTab === 1
      ? match.innings1BowlingTeamId
      : match.innings2BowlingTeamId

  const battingTeam = teams[battingTeamId]
  const bowlingTeam = teams[bowlingTeamId]

  const battingPlayerIds = battingTeam?.playerIds ?? []
  const bowlingPlayerIds = bowlingTeam?.playerIds ?? []

  return (
    <div className="h-screen w-full max-w-md mx-auto flex flex-col justify-between bg-[#080C0E] text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1A262B] bg-[#0E1517]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-[#121A1D] border border-slate-700 text-slate-300 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Match Scorecard
            </span>
            <h2 className="text-base font-black text-white leading-tight truncate max-w-[200px]">
              {teams[match.teamAId]?.name} vs {teams[match.teamBId]?.name}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onShare}
          className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center gap-1.5 text-xs shadow-md"
        >
          <Share2 size={16} />
          <span>Share</span>
        </button>
      </div>

      {/* Match Result Banner if finished */}
      {matchResult && (
        <div className="px-4 py-2 bg-emerald-950/60 border-b border-emerald-500/30 text-emerald-400 text-xs font-bold text-center">
          🏆 {matchResult}
        </div>
      )}

      {/* Innings Tabs */}
      <div className="grid grid-cols-3 p-2 bg-[#0A0F11] border-b border-[#1A262B] gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab(1)}
          className={`py-2 rounded-xl text-xs font-bold transition-all border truncate px-1 ${
            activeTab === 1
              ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold shadow'
              : 'bg-[#121A1D] text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          {teams[match.innings1BattingTeamId]?.name ?? '1st Inn'}
        </button>

        <button
          type="button"
          disabled={!innings2}
          onClick={() => setActiveTab(2)}
          className={`py-2 rounded-xl text-xs font-bold transition-all border truncate px-1 ${
            activeTab === 2
              ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold shadow'
              : !innings2
              ? 'bg-[#0E1517] text-slate-600 border-slate-900 opacity-50 cursor-not-allowed'
              : 'bg-[#121A1D] text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          {teams[match.innings2BattingTeamId]?.name ?? '2nd Inn'}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
            activeTab === 'analytics'
              ? 'bg-emerald-500 text-black border-emerald-400 font-extrabold shadow'
              : 'bg-[#121A1D] text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <BarChart2 size={13} />
          <span>Analytics</span>
        </button>
      </div>

      {/* Scorecard Scrollable Tables / Analytics View */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {activeTab === 'analytics' ? (
          <MatchAnalyticsView
            match={match}
            events={matchState.events}
            players={players as unknown as Record<string, PlayerRecord>}
            team1Name={teams[match.innings1BattingTeamId]?.name ?? 'Team 1'}
            team2Name={teams[match.innings1BowlingTeamId]?.name ?? 'Team 2'}
            target={innings1.totalRuns + 1}
          />
        ) : selectedInnings ? (
          <>
            {/* Innings Header Pill */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#121A1D] border border-[#233238]">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold">
                  {battingTeam?.name} Innings
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-mono font-black text-white">
                    {selectedInnings.totalRuns}/{selectedInnings.wickets}
                  </span>
                  <span className="text-sm font-mono text-slate-400 font-semibold">
                    ({selectedInnings.overs} ov)
                  </span>
                </div>
              </div>

              {selectedInnings.target && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Target
                  </span>
                  <span className="text-lg font-mono font-black text-amber-400">
                    {selectedInnings.target}
                  </span>
                </div>
              )}
            </div>

            {/* Batting Table */}
            <div className="bg-[#121A1D] border border-[#233238] rounded-xl overflow-hidden shadow">
              <div className="px-3 py-2 bg-[#182328] border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-emerald-400">
                Batting Scorecard
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="py-2 px-3">Batter</th>
                      <th className="py-2 px-2 text-right">R</th>
                      <th className="py-2 px-2 text-right">B</th>
                      <th className="py-2 px-2 text-right">4s</th>
                      <th className="py-2 px-2 text-right">6s</th>
                      <th className="py-2 px-3 text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {battingPlayerIds.map((pId) => {
                      const p = players[pId]
                      if (!p) return null
                      const stats = selectedInnings.batterStats[pId]
                      if (!stats && pId !== selectedInnings.currentStrikerId && pId !== selectedInnings.currentNonStrikerId) {
                        return null // Did not bat
                      }

                      const howOut = stats?.isOut
                        ? stats.dismissal?.type === 'bowled'
                          ? `b ${players[stats.dismissal.bowlerId ?? '']?.name ?? 'Bowler'}`
                          : stats.dismissal?.type === 'caught'
                          ? `c ${players[stats.dismissal.fielderId ?? '']?.name ?? 'Fielder'} b ${players[stats.dismissal.bowlerId ?? '']?.name ?? ''}`
                          : stats.dismissal?.type === 'runout'
                          ? 'run out'
                          : stats.dismissal?.type ?? 'out'
                        : stats?.ballsFaced
                        ? 'not out *'
                        : 'not out'

                      return (
                        <tr key={pId} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-sans">
                            <p className="font-bold text-white text-xs">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-normal truncate max-w-[130px]">
                              {howOut}
                            </p>
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-white text-sm">
                            {stats?.runs ?? 0}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-300">
                            {stats?.ballsFaced ?? 0}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-400">
                            {stats?.fours ?? 0}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-400">
                            {stats?.sixes ?? 0}
                          </td>
                          <td className="py-2 px-3 text-right text-emerald-400">
                            {stats?.strikeRate ?? 0}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Extras summary */}
              <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-slate-300">Extras</span>
                <span className="font-mono text-white font-bold">
                  {selectedInnings.extras.total}{' '}
                  <span className="text-[11px] text-slate-500 font-normal">
                    (b {selectedInnings.extras.byes}, lb {selectedInnings.extras.legByes}, w {selectedInnings.extras.wides}, nb {selectedInnings.extras.noBalls})
                  </span>
                </span>
              </div>
            </div>

            {/* Bowling Table */}
            <div className="bg-[#121A1D] border border-[#233238] rounded-xl overflow-hidden shadow">
              <div className="px-3 py-2 bg-[#182328] border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-emerald-400">
                Bowling Figures
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="py-2 px-3">Bowler</th>
                      <th className="py-2 px-2 text-right">O</th>
                      <th className="py-2 px-2 text-right">M</th>
                      <th className="py-2 px-2 text-right">R</th>
                      <th className="py-2 px-2 text-right">W</th>
                      <th className="py-2 px-3 text-right">Econ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {bowlingPlayerIds.map((pId) => {
                      const p = players[pId]
                      if (!p) return null
                      const stats = selectedInnings.bowlerStats[pId]
                      if (!stats && pId !== selectedInnings.currentBowlerId) {
                        return null
                      }

                      return (
                        <tr key={pId} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-sans font-bold text-white text-xs">
                            {p.name}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-200">
                            {stats?.overs ?? '0.0'}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-400">
                            {stats?.maidens ?? 0}
                          </td>
                          <td className="py-2 px-2 text-right text-slate-200 font-bold">
                            {stats?.runsConceded ?? 0}
                          </td>
                          <td className="py-2 px-2 text-right font-black text-rose-400 text-sm">
                            {stats?.wickets ?? 0}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">
                            {stats?.economy ?? 0}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fall of Wickets */}
            {selectedInnings.fallOfWickets.length > 0 && (
              <div className="bg-[#121A1D] border border-[#233238] rounded-xl p-3 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Fall of Wickets
                </span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedInnings.fallOfWickets.map((fow) => (
                    <span
                      key={fow.wicketNumber}
                      className="px-2.5 py-1 bg-[#182328] rounded-lg border border-slate-800 font-mono text-slate-300"
                    >
                      <strong className="text-white">{fow.score}/{fow.wicketNumber}</strong>{' '}
                      <span className="text-slate-400 font-sans">
                        ({players[fow.playerOutId]?.name ?? 'Batter'}, {fow.over} ov)
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-slate-500 text-sm font-mono">
            Innings 2 has not commenced yet.
          </div>
        )}
      </div>

      {/* Back button */}
      <div className="p-3 border-t border-[#1A262B] bg-[#0A0F11]">
        <button
          type="button"
          onClick={onBack}
          className="w-full h-12 bg-[#182328] hover:bg-[#233238] text-white font-bold rounded-xl text-sm border border-slate-700 transition-colors"
        >
          Return to Scoring
        </button>
      </div>
    </div>
  )
}
