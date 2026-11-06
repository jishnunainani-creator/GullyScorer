import React, { useEffect, useState } from 'react'
import { ArrowLeft, Trophy, ChevronRight } from 'lucide-react'
import { repository } from '../../db/repository'
import type { BallEvent } from '../../engine/types'
import { derivePlayerCareer } from '../../stats/career'
import {
  rankLeaderboard,
  type LeaderboardCategory,
  type RankedPlayerRow,
} from '../../stats/leaderboards'
import type { PlayerCareerStats } from '../../stats/types'

interface LeaderboardsScreenProps {
  onBack: () => void
  onSelectPlayer: (playerId: string) => void
}

export const LeaderboardsScreen: React.FC<LeaderboardsScreenProps> = ({
  onBack,
  onSelectPlayer,
}) => {
  const [loading, setLoading] = useState(true)
  const [careers, setCareers] = useState<PlayerCareerStats[]>([])
  const [timeFilter, setTimeFilter] = useState<'all' | '30d'>('all')
  const [oversFilter, setOversFilter] = useState<'all' | '5' | '10' | '20'>('all')
  const [category, setCategory] = useState<LeaderboardCategory>('mvp')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const allMatches = await repository.listMatches()
        const allPlayers = await repository.listPlayers()

        // Apply filters to matches
        const now = Date.now()
        const filteredMatches = allMatches.filter((m) => {
          if (m.status !== 'completed') return false
          if (timeFilter === '30d') {
            const mTime = new Date(m.date).getTime()
            if (now - mTime > 30 * 24 * 60 * 60 * 1000) return false
          }
          if (oversFilter !== 'all') {
            if (m.config.oversPerInnings !== parseInt(oversFilter, 10)) return false
          }
          return true
        })

        const eventsByMatchId: Record<string, BallEvent[]> = {}
        for (const m of filteredMatches) {
          eventsByMatchId[m.id] = await repository.getBallEvents(m.id)
        }

        const computedCareers = allPlayers.map((p) =>
          derivePlayerCareer(filteredMatches, eventsByMatchId, p, false),
        )

        setCareers(computedCareers)
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [timeFilter, oversFilter])

  const rankedRows: RankedPlayerRow[] = rankLeaderboard(careers, category)

  const categories: Array<{ id: LeaderboardCategory; label: string }> = [
    { id: 'mvp', label: 'MVP Points' },
    { id: 'runs', label: 'Most Runs' },
    { id: 'wickets', label: 'Most Wickets' },
    { id: 'average', label: 'Best Average' },
    { id: 'strike_rate', label: 'Strike Rate' },
    { id: 'economy', label: 'Economy' },
    { id: 'sixes', label: 'Most Sixes' },
    { id: 'catches', label: 'Catches' },
  ]

  return (
    <div className="h-screen w-full max-w-md mx-auto flex flex-col justify-between bg-[#080C0E] text-white p-4 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#1A262B] pb-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-[#121A1D] border border-slate-800 text-slate-300 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-black text-white">Leaderboards</h2>
            <p className="text-[10px] text-slate-400 font-mono">Rankings & Season Records</p>
          </div>
        </div>

        {/* Time and Overs Filter Pills */}
        <div className="flex flex-col gap-1 items-end">
          <div className="flex gap-1 bg-[#121A1D] p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-2 py-0.5 rounded-lg transition-colors ${
                timeFilter === 'all' ? 'bg-emerald-500 text-black' : 'text-slate-400'
              }`}
            >
              All-Time
            </button>
            <button
              onClick={() => setTimeFilter('30d')}
              className={`px-2 py-0.5 rounded-lg transition-colors ${
                timeFilter === '30d' ? 'bg-emerald-500 text-black' : 'text-slate-400'
              }`}
            >
              30 Days
            </button>
          </div>
          <div className="flex gap-1 bg-[#121A1D] p-0.5 rounded-lg border border-slate-800 text-[9px] font-mono">
            {(['all', '5', '10', '20'] as const).map((ov) => (
              <button
                key={ov}
                onClick={() => setOversFilter(ov)}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  oversFilter === ov ? 'bg-emerald-500 text-black font-bold' : 'text-slate-500'
                }`}
              >
                {ov === 'all' ? 'All' : `${ov}ov`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Horizontal Scroll Tab Bar */}
      <div className="py-2.5 flex gap-1.5 overflow-x-auto border-b border-slate-800/80 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              category === cat.id
                ? 'bg-emerald-500 text-black shadow-md'
                : 'bg-[#121A1D] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Ranked Players List */}
      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2">
        {loading ? (
          <div className="text-xs text-slate-500 font-mono py-12 text-center">
            Computing leaderboards...
          </div>
        ) : rankedRows.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs flex flex-col items-center gap-2">
            <Trophy size={28} className="text-slate-600 mb-1" />
            <p className="font-semibold text-slate-400">No qualifying players found</p>
            <p>Score completed matches to populate rankings and season records.</p>
          </div>
        ) : (
          rankedRows.map((row) => {
            const isTop3 = row.rank <= 3
            return (
              <div
                key={row.playerId}
                onClick={() => onSelectPlayer(row.playerId)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group active:scale-98 ${
                  row.rank === 1
                    ? 'bg-gradient-to-r from-amber-950/40 to-[#121A1D] border-amber-500/50'
                    : isTop3
                    ? 'bg-[#121A1D] border-amber-500/30 hover:border-slate-700'
                    : 'bg-[#121A1D] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-black ${
                      row.rank === 1
                        ? 'bg-amber-400 text-black'
                        : row.rank === 2
                        ? 'bg-slate-300 text-black'
                        : row.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {row.rank}
                  </span>

                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {row.playerName}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">{row.secondaryStat}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-right">
                  <span className="text-base font-mono font-black text-emerald-400">
                    {row.primaryStat}
                  </span>
                  <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-300" />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-[#1A262B] flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span>Min qualifiers apply to Avg/Econ</span>
        <span>Tap player for full career profile</span>
      </div>
    </div>
  )
}
