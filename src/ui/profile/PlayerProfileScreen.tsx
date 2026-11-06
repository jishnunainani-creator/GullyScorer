import React, { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Share2,
} from 'lucide-react'
import { repository } from '../../db/repository'
import type { PlayerRecord } from '../../db/schema'
import type { BallEvent } from '../../engine/types'
import { derivePlayerCareer } from '../../stats/career'
import { derivePlayerBadges } from '../../stats/milestones'
import { deriveHeadToHead } from '../../stats/headToHead'
import type { PlayerCareerStats, MilestoneBadge, HeadToHeadStats } from '../../stats/types'
import { PlayerCardModal } from './PlayerCardModal'

interface PlayerProfileScreenProps {
  playerId: string
  onBack: () => void
}

type TabType = 'overview' | 'batting' | 'bowling' | 'fielding' | 'matches' | 'h2h'

export const PlayerProfileScreen: React.FC<PlayerProfileScreenProps> = ({
  playerId,
  onBack,
}) => {
  const [player, setPlayer] = useState<PlayerRecord | null>(null)
  const [careerStats, setCareerStats] = useState<PlayerCareerStats | null>(null)
  const [badges, setBadges] = useState<MilestoneBadge[]>([])
  const [allOpponents, setAllOpponents] = useState<PlayerRecord[]>([])
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('')
  const [h2hStats, setH2hStats] = useState<HeadToHeadStats | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)
  const [allEvents, setAllEvents] = useState<BallEvent[]>([])

  useEffect(() => {
    async function loadPlayerData() {
      try {
        setLoading(true)
        const players = await repository.getPlayers([playerId])
        const p = players[0]
        if (!p) {
          setLoading(false)
          return
        }
        setPlayer(p)

        const matches = await repository.listMatches()
        const eventsMap: Record<string, BallEvent[]> = {}
        const collectedEvents: BallEvent[] = []

        for (const m of matches) {
          const mEvents = await repository.getBallEvents(m.id)
          eventsMap[m.id] = mEvents
          collectedEvents.push(...mEvents)
        }
        setAllEvents(collectedEvents)

        const stats = derivePlayerCareer(matches, eventsMap, p, true)
        setCareerStats(stats)

        const earnedBadges = derivePlayerBadges(stats)
        setBadges(earnedBadges)

        // Load opponents for head-to-head
        const otherPlayers = (await repository.listPlayers()).filter((x) => x.id !== playerId)
        setAllOpponents(otherPlayers)
        if (otherPlayers[0]) {
          setSelectedOpponentId(otherPlayers[0].id)
          const h2h = deriveHeadToHead(collectedEvents, playerId, otherPlayers[0].id)
          setH2hStats(h2h)
        }
      } finally {
        setLoading(false)
      }
    }

    void loadPlayerData()
  }, [playerId])

  const handleSelectOpponent = (oppId: string) => {
    setSelectedOpponentId(oppId)
    if (allEvents.length > 0) {
      const h2h = deriveHeadToHead(allEvents, playerId, oppId)
      setH2hStats(h2h)
    }
  }

  if (loading || !player || !careerStats) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#080C0E] text-slate-400 font-mono text-xs">
        Loading player profile...
      </div>
    )
  }

  const roleLabels: Record<string, string> = {
    batter: 'Pure Batter',
    bowler: 'Bowler',
    all_rounder: 'All-Rounder',
    player: 'Player',
  }

  return (
    <div className="h-screen w-full max-w-md mx-auto flex flex-col justify-between bg-[#080C0E] text-white p-4 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#1A262B] pb-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl bg-[#121A1D] border border-slate-800 text-slate-300 hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Share2 size={14} />
            <span>Player Card</span>
          </button>
        </div>
      </div>

      {/* Hero Player Identity */}
      <div className="pt-3 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">{player.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {roleLabels[careerStats.role]}
            </span>
            {player.leftHanded && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                Left-Handed
              </span>
            )}
            <span className="text-[11px] font-mono text-slate-400">
              {careerStats.matchesCount} {careerStats.matchesCount === 1 ? 'Match' : 'Matches'}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">MVP Points</span>
          <span className="text-xl font-mono font-black text-amber-400">
            {careerStats.mvpPoints}
          </span>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-800 pb-2 scrollbar-none">
        {(['overview', 'batting', 'bowling', 'fielding', 'h2h'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-emerald-500 text-black'
                : 'bg-[#121A1D] text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'h2h' ? 'Head-to-Head' : tab}
          </button>
        ))}
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-3">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Key Numbers Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-[#121A1D] border border-slate-800 rounded-xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500">Runs</span>
                <span className="text-xl font-mono font-black text-white">
                  {careerStats.batting.runs}
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  HS: {careerStats.batting.highestScore}
                  {careerStats.batting.highestScoreNotOut ? '*' : ''}
                </span>
              </div>

              <div className="p-3 bg-[#121A1D] border border-slate-800 rounded-xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500">Batting Avg</span>
                <span className="text-xl font-mono font-black text-white">
                  {careerStats.batting.average ?? '—'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  SR: {careerStats.batting.strikeRate}
                </span>
              </div>

              <div className="p-3 bg-[#121A1D] border border-slate-800 rounded-xl flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-500">Wickets</span>
                <span className="text-xl font-mono font-black text-white">
                  {careerStats.bowling.wickets}
                </span>
                <span className="text-[10px] font-mono text-purple-400">
                  BBI: {careerStats.bowling.bestFiguresDisplay}
                </span>
              </div>
            </div>

            {/* Recent Form Sparkline */}
            {careerStats.recentScores.length > 0 && (
              <div className="bg-[#121A1D] border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Recent Scores (Last {careerStats.recentScores.length} Innings)
                  </span>
                </div>
                <div className="flex items-end gap-1.5 h-16 pt-2">
                  {careerStats.recentScores.map((score, i) => {
                    const maxScore = Math.max(10, ...careerStats.recentScores)
                    const hPct = Math.max(12, (score / maxScore) * 100)
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-mono text-slate-400">{score}</span>
                        <div
                          style={{ height: `${hPct}%` }}
                          className={`w-full rounded-t ${
                            score >= 50
                              ? 'bg-amber-400'
                              : score >= 30
                              ? 'bg-emerald-400'
                              : 'bg-slate-700'
                          }`}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Badges & Milestones */}
            <div className="bg-[#121A1D] border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Milestones & Badges ({badges.length})
              </span>
              {badges.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">Play matches to unlock badges!</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {badges.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 bg-[#182328] border border-slate-800 rounded-xl flex items-center gap-2"
                    >
                      <span className="text-2xl">{b.icon}</span>
                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight">{b.title}</h4>
                        <p className="text-[10px] text-slate-400 line-clamp-1">{b.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* BATTING TAB */}
        {activeTab === 'batting' && (
          <div className="bg-[#121A1D] border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
              Career Batting Record
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Innings</span>
                <span className="font-mono font-bold text-white">
                  {careerStats.batting.innings}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Not Outs</span>
                <span className="font-mono font-bold text-emerald-400">
                  {careerStats.batting.notOuts}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Runs</span>
                <span className="font-mono font-bold text-white">{careerStats.batting.runs}</span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Balls Faced</span>
                <span className="font-mono font-bold text-white">
                  {careerStats.batting.ballsFaced}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Average</span>
                <span className="font-mono font-bold text-white">
                  {careerStats.batting.average ?? '—'}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Strike Rate</span>
                <span className="font-mono font-bold text-emerald-400">
                  {careerStats.batting.strikeRate}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Fours (4s)</span>
                <span className="font-mono font-bold text-white">{careerStats.batting.fours}</span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Sixes (6s)</span>
                <span className="font-mono font-bold text-white">{careerStats.batting.sixes}</span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Fifties (50+)</span>
                <span className="font-mono font-bold text-white">
                  {careerStats.batting.fifties}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Centuries</span>
                <span className="font-mono font-bold text-amber-400">
                  {careerStats.batting.centuries}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Dot Ball %</span>
                <span className="font-mono font-bold text-slate-300">
                  {careerStats.batting.dotBallPercentage}%
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Boundary %</span>
                <span className="font-mono font-bold text-emerald-400">
                  {careerStats.batting.boundaryPercentage}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* BOWLING TAB */}
        {activeTab === 'bowling' && (
          <div className="bg-[#121A1D] border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
              Career Bowling Record
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Overs</span>
                <span className="font-mono font-bold text-white">
                  {careerStats.bowling.overs}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Maidens</span>
                <span className="font-mono font-bold text-emerald-400">
                  {careerStats.bowling.maidens}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Runs Conceded</span>
                <span className="font-mono font-bold text-white">
                  {careerStats.bowling.runsConceded}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Wickets</span>
                <span className="font-mono font-bold text-purple-400">
                  {careerStats.bowling.wickets}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Economy</span>
                <span className="font-mono font-bold text-white">
                  {careerStats.bowling.economy}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Average</span>
                <span className="font-mono font-bold text-white">
                  {careerStats.bowling.average ?? '—'}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Best Figures</span>
                <span className="font-mono font-bold text-emerald-400">
                  {careerStats.bowling.bestFiguresDisplay}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">3-Wkt Hauls</span>
                <span className="font-mono font-bold text-white">
                  {careerStats.bowling.threeWickets}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">5-Wkt Hauls</span>
                <span className="font-mono font-bold text-amber-400">
                  {careerStats.bowling.fiveWickets}
                </span>
              </div>
              <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                <span className="text-slate-400">Hat-Tricks</span>
                <span className="font-mono font-bold text-rose-400">
                  {careerStats.bowling.hatTricks}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* FIELDING TAB */}
        {activeTab === 'fielding' && (
          <div className="bg-[#121A1D] border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
              Fielding Record
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-[#182328] rounded-xl flex justify-between items-center">
                <span className="text-slate-400">Catches</span>
                <span className="font-mono text-base font-bold text-white">
                  {careerStats.fielding.catches}
                </span>
              </div>
              <div className="p-3 bg-[#182328] rounded-xl flex justify-between items-center">
                <span className="text-slate-400">Run Outs</span>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {careerStats.fielding.runOuts}
                </span>
              </div>
              <div className="p-3 bg-[#182328] rounded-xl flex justify-between items-center">
                <span className="text-slate-400">Stumpings</span>
                <span className="font-mono text-base font-bold text-purple-400">
                  {careerStats.fielding.stumpings}
                </span>
              </div>
              <div className="p-3 bg-[#182328] rounded-xl flex justify-between items-center">
                <span className="text-slate-400">Total Dismissals</span>
                <span className="font-mono text-base font-bold text-white">
                  {careerStats.fielding.totalDismissals}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* HEAD TO HEAD TAB */}
        {activeTab === 'h2h' && (
          <div className="bg-[#121A1D] border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Match-up: {player.name} (Bat) vs
              </span>
              <select
                value={selectedOpponentId}
                onChange={(e) => handleSelectOpponent(e.target.value)}
                className="bg-[#182328] border border-slate-700 rounded-lg text-xs font-bold text-emerald-400 px-2 py-1 max-w-[130px] truncate"
              >
                {allOpponents.map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    {opp.name}
                  </option>
                ))}
              </select>
            </div>

            {h2hStats ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                  <span className="text-slate-400">Balls Faced</span>
                  <span className="font-mono font-bold text-white">{h2hStats.ballsFaced}</span>
                </div>
                <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                  <span className="text-slate-400">Runs Scored</span>
                  <span className="font-mono font-bold text-emerald-400">{h2hStats.runs}</span>
                </div>
                <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                  <span className="text-slate-400">Dismissals</span>
                  <span className="font-mono font-bold text-rose-400">{h2hStats.dismissals}</span>
                </div>
                <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                  <span className="text-slate-400">Strike Rate</span>
                  <span className="font-mono font-bold text-white">{h2hStats.strikeRate}</span>
                </div>
                <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                  <span className="text-slate-400">4s / 6s</span>
                  <span className="font-mono font-bold text-white">
                    {h2hStats.fours} / {h2hStats.sixes}
                  </span>
                </div>
                <div className="p-2.5 bg-[#182328] rounded-xl flex justify-between">
                  <span className="text-slate-400">Dot Balls</span>
                  <span className="font-mono font-bold text-slate-300">{h2hStats.dotBalls}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3 text-center">
                No head-to-head encounters found.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Shareable Card Modal */}
      {showShareModal && (
        <PlayerCardModal
          player={player}
          career={careerStats}
          topBadge={badges[0]}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}
