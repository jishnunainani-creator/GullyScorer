import React, { useState, useEffect, useMemo } from 'react'
import {
  Trophy,
  Calendar,
  BarChart2,
  Award,
  RefreshCw,
  ExternalLink,
  Flame,
  ArrowLeft,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { repository } from '../../db/repository'
import type {
  Tournament,
  TournamentTeam,
  Fixture,
  TeamStandingsRow,
  TournamentResult,
} from '../../tournament/types'
import { deriveTournamentStandings } from '../../tournament/standings'
import { deriveTournamentResult } from '../../tournament/result'
import { computeTournamentStats } from '../../tournament/stats'
import type { MatchRecord } from '../../db/schema'
import type { BallEvent } from '../../engine/types'
import { TeamNrrAuditModal } from './TeamNrrAuditModal'

interface PublicTournamentScreenProps {
  token: string
  onBackToApp?: () => void
}

export const PublicTournamentScreen: React.FC<PublicTournamentScreenProps> = ({
  token,
  onBackToApp,
}) => {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<TournamentTeam[]>([])
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [matches, setMatches] = useState<Record<string, MatchRecord>>({})
  const [matchEvents, setMatchEvents] = useState<Record<string, BallEvent[]>>({})
  const [activeTab, setActiveTab] = useState<'standings' | 'fixtures' | 'stats'>('standings')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now())
  const [selectedAuditRow, setSelectedAuditRow] = useState<TeamStandingsRow | null>(null)

  const fetchData = async () => {
    try {
      // 1. Try fetching via RPC from Supabase
      if (supabase) {
        const { data, error: rpcError } = await supabase.rpc('get_public_tournament', {
          token,
        })
        if (!rpcError && data) {
          const tData = data.tournament as Tournament
          setTournament(tData)
          setTeams(data.teams as TournamentTeam[])
          setFixtures(data.fixtures as Fixture[])
          setLoading(false)
          setLastRefreshed(Date.now())
          return
        }
      }

      // 2. Fallback: Search local Dexie for matching shareToken
      const localTournaments = await repository.listTournaments()
      const found = localTournaments.find((t) => t.shareToken === token)
      if (found) {
        setTournament(found)
        const tt = await repository.getTournamentTeams(found.id)
        setTeams(tt)
        const fix = await repository.getFixtures(found.id)
        setFixtures(fix)

        // Load matches & events
        const mMap: Record<string, MatchRecord> = {}
        const eMap: Record<string, BallEvent[]> = {}
        for (const f of fix) {
          if (f.matchId) {
            const m = await repository.getMatch(f.matchId)
            if (m) {
              mMap[f.matchId] = m
              eMap[f.matchId] = await repository.getBallEvents(f.matchId)
            }
          }
        }
        setMatches(mMap)
        setMatchEvents(eMap)
        setLoading(false)
        setLastRefreshed(Date.now())
        return
      }

      setError('Tournament not found or not published.')
    } catch (err) {
      setError('Failed to load tournament.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
    // 15-second polling for live updates
    const timer = setInterval(() => {
      void fetchData()
    }, 15000)
    return () => clearInterval(timer)
  }, [token])

  const teamsById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of teams) {
      map[t.teamId] = t.nameSnapshot
      map[t.id] = t.nameSnapshot
    }
    return map
  }, [teams])

  // Pure dynamic standings derivation
  const standings = useMemo(() => {
    if (!tournament) return []
    const resultsMap: Record<string, TournamentResult> = {}
    for (const f of fixtures) {
      if (f.resultOverride) {
        resultsMap[f.id] = {
          fixtureId: f.id,
          matchId: f.matchId ?? `m-${f.id}`,
          winnerTeamId: f.resultOverride.winnerTeamId ?? null,
          isTie: f.resultOverride.type === 'tie_decided_manually',
          isNoResult:
            f.resultOverride.type === 'abandoned' || f.resultOverride.type === 'no_result',
          isSuperOver: false,
          innings1: {
            teamId: f.homeTeamId ?? '',
            runs: 0,
            wickets: 0,
            legalBalls: 0,
            oversString: '0.0',
            isAllOut: false,
            allocatedQuotaBalls: tournament.oversPerInnings * 6,
          },
          innings2: {
            teamId: f.awayTeamId ?? '',
            runs: 0,
            wickets: 0,
            legalBalls: 0,
            oversString: '0.0',
            isAllOut: false,
            allocatedQuotaBalls: tournament.oversPerInnings * 6,
          },
          marginText: f.resultOverride.note ?? 'Result Override',
        }
      } else if (f.matchId && matches[f.matchId]) {
        const m = matches[f.matchId]!
        const evts = matchEvents[f.matchId] ?? []
        if (evts.length > 0) {
          resultsMap[f.id] = deriveTournamentResult(
            f,
            m.config,
            evts,
            f.homeTeamId ?? '',
            f.awayTeamId ?? '',
          )
        }
      }
    }
    const grouped = deriveTournamentStandings(tournament, teams, fixtures, resultsMap)
    return Object.values(grouped).flat()
  }, [tournament, teams, fixtures, matchEvents, matches])

  // Pure dynamic stats derivation
  const tournamentStats = useMemo(() => {
    return computeTournamentStats(fixtures, matchEvents, matches, teams, [])
  }, [fixtures, matchEvents, matches, teams])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080C0E] text-white flex flex-col items-center justify-center p-4 gap-3">
        <Trophy className="w-8 h-8 text-amber-400 animate-pulse" />
        <span className="text-xs text-slate-400">Loading live tournament...</span>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-[#080C0E] text-white flex flex-col items-center justify-center p-4 gap-4 text-center">
        <Trophy className="w-12 h-12 text-slate-600" />
        <div>
          <h2 className="text-base font-bold text-white mb-1">Tournament Unavailable</h2>
          <p className="text-xs text-slate-400 max-w-xs">{error || 'This tournament could not be found.'}</p>
        </div>
        {onBackToApp && (
          <button
            onClick={onBackToApp}
            className="px-4 py-2 rounded-xl bg-[#182328] border border-[#28383F] text-xs font-semibold text-slate-300 hover:text-white"
          >
            Go to App Home
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080C0E] text-white p-4 max-w-3xl mx-auto flex flex-col gap-4 pb-16">
      {/* Top Banner */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="p-2 rounded-xl bg-[#121A1D] border border-[#233238] text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/60">
                {tournament.format.replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {tournament.oversPerInnings} Overs Match
              </span>
            </div>
            <h1 className="text-lg font-black text-white mt-0.5">{tournament.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            Updated {new Date(lastRefreshed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={() => void fetchData()}
            className="p-2 rounded-xl bg-[#121A1D] border border-[#233238] text-slate-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#233238] pb-1">
        {[
          { id: 'standings', label: 'Points Table', icon: BarChart2 },
          { id: 'fixtures', label: 'Fixtures', icon: Calendar },
          { id: 'stats', label: 'Top Performers', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                isActive
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#121A1D] text-slate-400 hover:text-white border border-[#233238]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB 1: POINTS TABLE */}
      {activeTab === 'standings' && (
        <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-semibold text-white">Tournament Standings</span>
            <span className="text-[10px]">Click row to inspect NRR</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#233238] text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-1 text-center">#</th>
                  <th className="py-2 px-2">Team</th>
                  <th className="py-2 px-1 text-center">P</th>
                  <th className="py-2 px-1 text-center">W</th>
                  <th className="py-2 px-1 text-center">L</th>
                  <th className="py-2 px-1 text-center font-bold text-amber-400">Pts</th>
                  <th className="py-2 px-2 text-right">NRR</th>
                  <th className="py-2 px-2 text-center">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182328]">
                {standings.map((r: TeamStandingsRow, idx: number) => (
                  <tr
                    key={r.teamId}
                    onClick={() => setSelectedAuditRow(r)}
                    className="cursor-pointer hover:bg-[#182328] transition"
                  >
                    <td className="py-2.5 px-1 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-2 font-bold text-slate-100 whitespace-nowrap">
                      {r.teamName}
                    </td>
                    <td className="py-2.5 px-1 text-center font-mono text-slate-300">{r.played}</td>
                    <td className="py-2.5 px-1 text-center font-mono text-emerald-400 font-semibold">
                      {r.won}
                    </td>
                    <td className="py-2.5 px-1 text-center font-mono text-rose-400">{r.lost}</td>
                    <td className="py-2.5 px-1 text-center font-mono font-black text-amber-400 text-sm">
                      {r.points}
                    </td>
                    <td
                      className={`py-2.5 px-2 text-right font-mono font-semibold ${
                        r.nrr > 0 ? 'text-emerald-400' : r.nrr < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {r.nrrText}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="flex justify-center gap-1">
                        {r.last5Form.map((res: 'W' | 'L' | 'T' | 'N', fIdx: number) => (
                          <span
                            key={fIdx}
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              res === 'W'
                                ? 'bg-emerald-900 text-emerald-300'
                                : res === 'L'
                                  ? 'bg-rose-900 text-rose-300'
                                  : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {res}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FIXTURES */}
      {activeTab === 'fixtures' && (
        <div className="flex flex-col gap-3">
          {fixtures.map((fix, idx) => {
            const t1 = fix.homeTeamId ? teamsById[fix.homeTeamId] ?? 'TBD' : 'TBD'
            const t2 = fix.awayTeamId ? teamsById[fix.awayTeamId] ?? 'TBD' : 'TBD'
            const isLive = fix.status === 'live'
            const match = fix.matchId ? matches[fix.matchId] : null
            const roundName =
              fix.stage === 'league' || fix.stage === 'group'
                ? `Round ${fix.round}`
                : fix.stage.replace('_', ' ').toUpperCase()

            return (
              <div
                key={fix.id}
                className={`bg-[#121A1D] border rounded-2xl p-4 flex flex-col gap-2.5 transition ${
                  isLive ? 'border-rose-500/60 shadow-lg shadow-rose-950/20' : 'border-[#233238]'
                }`}
              >
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Match #{idx + 1} • {roundName}</span>
                  {isLive ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      Live
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-semibold text-slate-500">
                      {fix.status}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="font-bold text-base text-slate-100 truncate">{t1}</span>
                  <span className="text-xs font-black text-amber-400 font-mono px-3">VS</span>
                  <span className="font-bold text-base text-slate-100 truncate text-right">{t2}</span>
                </div>

                {fix.resultOverride?.note && (
                  <div className="p-2 rounded-xl bg-[#182328] text-xs font-medium text-amber-300 text-center">
                    {fix.resultOverride.note}
                  </div>
                )}

                {isLive && match?.shareToken && (
                  <a
                    href={`/live/${match.shareToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 w-full py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow transition"
                  >
                    <span>Watch Live Ball-by-Ball</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* TAB 3: STATS */}
      {activeTab === 'stats' && (
        <div className="flex flex-col gap-4">
          {/* Orange Cap */}
          <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Orange Cap (Top Run Scorers)</h3>
            </div>
            {tournamentStats.orangeCap.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-4">No stats recorded yet.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {tournamentStats.orangeCap.slice(0, 5).map((b, i) => (
                  <div
                    key={b.playerId}
                    className="flex justify-between items-center bg-[#182328] px-3 py-2 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-amber-400">#{i + 1}</span>
                      <span className="font-bold text-slate-200">{b.playerName}</span>
                    </div>
                    <span className="font-mono font-black text-white">{b.runs} runs</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Purple Cap */}
          <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Purple Cap (Top Wicket Takers)</h3>
            </div>
            {tournamentStats.purpleCap.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-4">No stats recorded yet.</div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {tournamentStats.purpleCap.slice(0, 5).map((w, i) => (
                  <div
                    key={w.playerId}
                    className="flex justify-between items-center bg-[#182328] px-3 py-2 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-purple-400">#{i + 1}</span>
                      <span className="font-bold text-slate-200">{w.playerName}</span>
                    </div>
                    <span className="font-mono font-black text-white">{w.wickets} wkts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team NRR Audit Modal */}
      {selectedAuditRow && (
        <TeamNrrAuditModal
          row={selectedAuditRow}
          onClose={() => setSelectedAuditRow(null)}
        />
      )}
    </div>
  )
}
