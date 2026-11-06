import React, { useEffect, useState } from 'react'
import { Plus, Play, Calendar, Download, Users, Settings, Trophy, User, ChevronRight } from 'lucide-react'
import { repository } from '../db/repository'
import type { MatchRecord, TeamRecord } from '../db/schema'

interface HomeProps {
  onNewMatch: () => void
  onResumeMatch: (matchId: string) => void
  onViewScorecard: (matchId: string) => void
  onOpenSettings?: () => void
  onOpenTeams?: () => void
  onOpenPlayers?: () => void
  onOpenLeaderboards?: () => void
  onOpenTournaments?: () => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const Home: React.FC<HomeProps> = ({
  onNewMatch,
  onResumeMatch,
  onViewScorecard,
  onOpenSettings,
  onOpenTeams,
  onOpenPlayers,
  onOpenLeaderboards,
  onOpenTournaments,
}) => {
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [teams, setTeams] = useState<Record<string, TeamRecord>>({})
  const [loading, setLoading] = useState(true)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const matchRecords = await repository.listMatches()
        setMatches(matchRecords)

        const allTeamIds = Array.from(
          new Set(matchRecords.flatMap((m: MatchRecord) => [m.teamAId, m.teamBId])),
        )
        const teamRecords = await repository.getTeams(allTeamIds)
        const tMap: Record<string, TeamRecord> = {}
        for (const t of teamRecords) {
          tMap[t.id] = t
        }
        setTeams(tMap)
      } finally {
        setLoading(false)
      }
    }
    void loadData()

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  // Active in-progress match (if any)
  const activeMatch = matches.find((m) => m.status === 'in_progress')

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col justify-between bg-[#080C0E] text-white p-4">
      {/* Top Branding */}
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex items-center justify-between border-b border-[#1A262B] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50" />
            <h1 className="text-xl font-mono font-black tracking-wider text-white">
              PITCHLOG
            </h1>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5">
            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Download size={13} />
                <span>Install</span>
              </button>
            )}
            {onOpenLeaderboards && (
              <button
                type="button"
                onClick={onOpenLeaderboards}
                className="p-2 rounded-xl bg-[#121A1D] border border-slate-800 text-amber-400 hover:text-amber-300 transition-colors"
                title="Leaderboards & Rankings"
              >
                <Trophy size={16} />
              </button>
            )}
            {onOpenPlayers && (
              <button
                type="button"
                onClick={onOpenPlayers}
                className="p-2 rounded-xl bg-[#121A1D] border border-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Player Profiles & Stats"
              >
                <User size={16} />
              </button>
            )}
            {onOpenTeams && (
              <button
                type="button"
                onClick={onOpenTeams}
                className="p-2 rounded-xl bg-[#121A1D] border border-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Teams Library"
              >
                <Users size={16} />
              </button>
            )}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 rounded-xl bg-[#121A1D] border border-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Settings & Cloud"
              >
                <Settings size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Hero "New Match" Button (Thumb Friendly, 56px min height) */}
        <button
          type="button"
          onClick={onNewMatch}
          className="w-full h-16 min-h-[56px] bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-base rounded-2xl transition-all shadow-xl shadow-emerald-950/50 active:scale-98 flex items-center justify-center gap-2.5"
        >
          <Plus size={22} strokeWidth={3} />
          <span>START NEW MATCH</span>
        </button>

        {/* Tournaments Card */}
        {onOpenTournaments && (
          <button
            type="button"
            onClick={onOpenTournaments}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#182328] to-[#121A1D] hover:border-amber-500/50 border border-[#233238] rounded-2xl transition-all shadow-md flex items-center justify-between group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition">
                <Trophy size={18} />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-white block">Tournaments & Leagues</span>
                <span className="text-[10px] text-slate-400">Fixtures, Knockouts & Points Table (NRR)</span>
              </div>
            </div>
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <span>Manage</span>
              <ChevronRight size={14} />
            </div>
          </button>
        )}

        {/* Resume In-Progress Match Card */}
        {activeMatch && (
          <div className="bg-gradient-to-r from-[#121E23] to-[#121A1D] border border-emerald-500/40 rounded-2xl p-4 flex flex-col gap-3 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Match In Progress
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(activeMatch.updatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-black text-white truncate max-w-[240px]">
                {teams[activeMatch.teamAId]?.name ?? 'Team A'} vs{' '}
                {teams[activeMatch.teamBId]?.name ?? 'Team B'}
              </h3>
              <span className="text-xs font-mono font-bold text-slate-300">
                Inn {activeMatch.currentInningsNo}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onResumeMatch(activeMatch.id)}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-98 shadow"
            >
              <Play size={16} fill="currentColor" />
              <span>RESUME SCORING</span>
            </button>
          </div>
        )}

        {/* Past Matches List */}
        <div className="flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Match History ({matches.length})
            </span>
          </div>

          {loading ? (
            <div className="text-xs text-slate-500 font-mono py-8 text-center">
              Loading saved matches...
            </div>
          ) : matches.length === 0 ? (
            <div className="p-8 text-center bg-[#121A1D] border border-[#233238] rounded-2xl flex flex-col items-center gap-2 text-slate-500 text-xs">
              <Calendar size={28} className="text-slate-600 mb-1" />
              <p className="font-semibold text-slate-400">No matches recorded yet</p>
              <p>Tap "Start New Match" above to score your first gully or club game!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[48vh] overflow-y-auto pr-1">
              {matches.map((m) => {
                const teamA = teams[m.teamAId]?.name ?? 'Team A'
                const teamB = teams[m.teamBId]?.name ?? 'Team B'

                return (
                  <div
                    key={m.id}
                    onClick={() => onViewScorecard(m.id)}
                    className="p-3.5 bg-[#121A1D] hover:bg-[#182328] border border-[#233238] hover:border-slate-600 rounded-xl cursor-pointer transition-all flex flex-col gap-1.5 active:scale-99 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{new Date(m.date).toLocaleDateString()}</span>
                      <span
                        className={`font-semibold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                          m.status === 'in_progress'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {m.status === 'in_progress' ? 'In Progress' : 'Completed'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white truncate max-w-[240px]">
                        {teamA} vs {teamB}
                      </h4>
                      <span className="text-xs font-mono font-semibold text-slate-400">
                        {m.config.oversPerInnings} ov
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 pb-2 border-t border-[#1A262B] flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Offline-First Cricket Scorer</span>
        <span>v0.1.0</span>
      </div>
    </div>
  )
}
