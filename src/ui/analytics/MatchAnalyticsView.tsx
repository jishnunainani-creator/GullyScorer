import React, { useState } from 'react'
import {
  Trophy,
  Download,
  Share2,
} from 'lucide-react'
import type { BallEvent } from '../../engine/types'
import type { MatchRecord, PlayerRecord } from '../../db/schema'
import { deriveMatchAnalysis } from '../../stats/matchStats'
import { generateMatchScorecardCsv } from '../../stats/exportCsv'
import { ManhattanChart } from '../charts/ManhattanChart'
import { WormChart } from '../charts/WormChart'
import { WagonWheelChart } from '../charts/WagonWheelChart'
import { RunsBreakdownChart } from '../charts/RunsBreakdownChart'
import { MatchMvpCardModal } from './MatchMvpCardModal'

interface MatchAnalyticsViewProps {
  match: MatchRecord
  events: BallEvent[]
  players: Record<string, PlayerRecord>
  team1Name: string
  team2Name: string
  target?: number | null
}

type AnalyticsSubTab = 'overview' | 'wagon' | 'manhattan' | 'worm' | 'partnerships' | 'mvp'

export const MatchAnalyticsView: React.FC<MatchAnalyticsViewProps> = ({
  match,
  events,
  players,
  team1Name,
  team2Name,
  target,
}) => {
  const [subTab, setSubTab] = useState<AnalyticsSubTab>('overview')
  const [selectedBatterId, setSelectedBatterId] = useState<string>('')
  const [showMvpCardModal, setShowMvpCardModal] = useState(false)

  const allPlayerIds = Object.keys(players)
  const analysis = deriveMatchAnalysis(events, match, allPlayerIds)

  const handleDownloadCsv = () => {
    const playerNames: Record<string, string> = {}
    for (const [id, p] of Object.entries(players)) {
      playerNames[id] = p.name
    }
    const csvContent = generateMatchScorecardCsv(match, events, playerNames)
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scorecard-${match.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-3 py-2">
      {/* Sub-tabs header */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto border-b border-slate-800 pb-2 scrollbar-none">
        <div className="flex gap-1">
          {(
            [
              'overview',
              'manhattan',
              'worm',
              'wagon',
              'partnerships',
              'mvp',
            ] as const
          ).map((t) => (
            <button
              key={t}
              onClick={() => setSubTab(t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                subTab === t
                  ? 'bg-emerald-500 text-black'
                  : 'bg-[#121A1D] text-slate-400 hover:text-white'
              }`}
            >
              {t === 'wagon' ? 'Wagon' : t}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="p-1.5 rounded-lg bg-[#182328] hover:bg-[#202E34] text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 transition-all"
          title="Export CSV"
        >
          <Download size={13} />
          <span className="text-[10px]">CSV</span>
        </button>
      </div>

      {/* OVERVIEW / SUMMARY */}
      {subTab === 'overview' && (
        <div className="flex flex-col gap-3">
          {/* Player of the Match Card */}
          {analysis.playerOfTheMatch && (
            <div className="p-3.5 bg-gradient-to-r from-amber-950/40 to-[#121A1D] border border-amber-500/40 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                  <Trophy size={12} />
                  Player of the Match
                </span>
                <h4 className="text-base font-black text-white mt-0.5">
                  {players[analysis.playerOfTheMatch.playerId]?.name ?? 'Match Hero'}
                </h4>
                <p className="text-[11px] text-slate-300 font-mono">
                  {analysis.playerOfTheMatch.totalPoints} Impact Pts •{' '}
                  {analysis.playerOfTheMatch.runs} Runs •{' '}
                  {analysis.playerOfTheMatch.wickets} Wkts
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMvpCardModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Share2 size={13} />
                <span>Card</span>
              </button>
            </div>
          )}

          {/* Scoring Breakdown Chart */}
          <RunsBreakdownChart events={events} />

          {/* Mini Manhattan & Worm Previews */}
          <ManhattanChart
            inn1RunsPerOver={analysis.runsPerOver[1] ?? []}
            inn2RunsPerOver={analysis.runsPerOver[2] ?? []}
            inn1WicketsPerOver={analysis.wicketsPerOver[1] ?? []}
            inn2WicketsPerOver={analysis.wicketsPerOver[2] ?? []}
            team1Name={team1Name}
            team2Name={team2Name}
          />
        </div>
      )}

      {/* MANHATTAN */}
      {subTab === 'manhattan' && (
        <ManhattanChart
          inn1RunsPerOver={analysis.runsPerOver[1] ?? []}
          inn2RunsPerOver={analysis.runsPerOver[2] ?? []}
          inn1WicketsPerOver={analysis.wicketsPerOver[1] ?? []}
          inn2WicketsPerOver={analysis.wicketsPerOver[2] ?? []}
          team1Name={team1Name}
          team2Name={team2Name}
        />
      )}

      {/* WORM */}
      {subTab === 'worm' && (
        <WormChart
          inn1CumulativeRuns={analysis.cumulativeRunsPerOver[1] ?? []}
          inn2CumulativeRuns={analysis.cumulativeRunsPerOver[2] ?? []}
          inn1WicketsPerOver={analysis.wicketsPerOver[1] ?? []}
          inn2WicketsPerOver={analysis.wicketsPerOver[2] ?? []}
          target={target}
          team1Name={team1Name}
          team2Name={team2Name}
        />
      )}

      {/* WAGON WHEEL */}
      {subTab === 'wagon' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400">Filter Batter:</span>
            <select
              value={selectedBatterId}
              onChange={(e) => setSelectedBatterId(e.target.value)}
              className="bg-[#182328] border border-slate-700 rounded-lg text-xs font-bold text-emerald-400 px-2 py-1 max-w-[140px] truncate"
            >
              <option value="">All Batters</option>
              {Object.values(players).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <WagonWheelChart
            events={events}
            batterId={selectedBatterId || undefined}
            isLeftHanded={
              selectedBatterId ? Boolean(players[selectedBatterId]?.leftHanded) : false
            }
          />
        </div>
      )}

      {/* PARTNERSHIPS */}
      {subTab === 'partnerships' && (
        <div className="flex flex-col gap-3">
          {[1, 2].map((innNo) => {
            const list = analysis.partnerships[innNo] ?? []
            if (list.length === 0) return null

            return (
              <div
                key={innNo}
                className="bg-[#121A1D] border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Innings {innNo} Partnerships
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Best: {analysis.bestPartnerships[innNo]?.runs ?? 0} Runs
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {list.map((p, pIdx) => {
                    const b1Name = players[p.batter1Id]?.name ?? 'Batter 1'
                    const b2Name = players[p.batter2Id]?.name ?? 'Batter 2'
                    const b1Runs = p.batter1Runs
                    const b2Runs = p.batter2Runs

                    return (
                      <div
                        key={pIdx}
                        className="p-3 bg-[#182328] rounded-xl border border-slate-800 flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono font-bold">
                          <span className="text-white">
                            {p.runs} Runs ({p.balls} Balls)
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            Wkt {pIdx + 1}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            {b1Name} ({b1Runs})
                          </span>
                          <span>
                            {b2Name} ({b2Runs})
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MVP LEADERBOARD */}
      {subTab === 'mvp' && (
        <div className="bg-[#121A1D] border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Match Impact Rankings
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {analysis.mvpRanking.map((item, idx) => {
              const pName = players[item.playerId]?.name ?? 'Player'
              const isPotm = idx === 0

              return (
                <div
                  key={item.playerId}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isPotm
                      ? 'bg-amber-950/30 border-amber-500/40'
                      : 'bg-[#182328] border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isPotm ? 'bg-amber-400 text-black font-mono' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-white leading-tight">{pName}</h5>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {item.runs > 0 && `${item.runs}r `}
                        {item.wickets > 0 && `${item.wickets}w `}
                        {item.catches + item.runOuts > 0 &&
                          `${item.catches + item.runOuts}f`}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono font-black text-sm text-amber-400">
                    {item.totalPoints} PTS
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Match MVP Share Modal */}
      {showMvpCardModal && analysis.playerOfTheMatch && (
        <MatchMvpCardModal
          mvp={analysis.playerOfTheMatch}
          playerName={players[analysis.playerOfTheMatch.playerId]?.name ?? 'MVP'}
          match={match}
          team1Name={team1Name}
          team2Name={team2Name}
          onClose={() => setShowMvpCardModal(false)}
        />
      )}
    </div>
  )
}
