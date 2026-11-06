import React, { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeft,
  Calendar,
  BarChart2,
  GitBranch,
  Users,
  Settings,
  Share2,
  Play,
  FileText,
  Download,
  Copy,
  Check,
  Flame,
  Award,
} from 'lucide-react'
import { repository } from '../../db/repository'
import type { MatchRecord, PlayerRecord } from '../../db/schema'
import type { BallEvent } from '../../engine/types'
import type {
  Tournament,
  TournamentTeam,
  Fixture,
  TeamStandingsRow,
  ResultOverride,
  TournamentResult,
} from '../../tournament/types'
import { deriveTournamentStandings } from '../../tournament/standings'
import { deriveTournamentResult } from '../../tournament/result'
import { advanceKnockoutWinner } from '../../tournament/bracket'
import { computeTournamentStats } from '../../tournament/stats'
import { exportStandingsToCsv, exportFixturesToCsv } from '../../tournament/exportCsv'
import { TeamNrrAuditModal } from './TeamNrrAuditModal'
import { TournamentShareCardModal } from './TournamentShareCardModal'

interface TournamentDashboardScreenProps {
  tournamentId: string
  onBack: () => void
  onScoreFixture: (fixture: Fixture, team1Name: string, team2Name: string) => void
  onViewMatchScorecard: (matchId: string) => void
}

type TabType = 'fixtures' | 'standings' | 'bracket' | 'stats' | 'teams' | 'settings'

export const TournamentDashboardScreen: React.FC<TournamentDashboardScreenProps> = ({
  tournamentId,
  onBack,
  onScoreFixture,
  onViewMatchScorecard,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('fixtures')
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<TournamentTeam[]>([])
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [matches, setMatches] = useState<Record<string, MatchRecord>>({})
  const [matchEvents, setMatchEvents] = useState<Record<string, BallEvent[]>>({})
  const [players, setPlayers] = useState<PlayerRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [selectedAuditRow, setSelectedAuditRow] = useState<TeamStandingsRow | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [overrideFixture, setOverrideFixture] = useState<Fixture | null>(null)
  const [overrideWinnerId, setOverrideWinnerId] = useState<string>('')
  const [overrideReason, setOverrideReason] = useState<
    'walkover' | 'abandoned_no_result' | 'tied_super_over' | 'revised_target'
  >('walkover')
  const [overrideNotes, setOverrideNotes] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  // Filter for fixtures tab
  const [fixtureStageFilter, setFixtureStageFilter] = useState<'all' | 'group' | 'knockout'>('all')

  const loadAllData = async () => {
    try {
      setLoading(true)
      const t = await repository.getTournament(tournamentId)
      if (!t) return
      setTournament(t)

      const tt = await repository.getTournamentTeams(tournamentId)
      setTeams(tt)

      const fix = await repository.getFixtures(tournamentId)
      setFixtures(fix)

      // Fetch matches and events for attached fixtures
      const matchIds = fix.map((f) => f.matchId).filter((id): id is string => Boolean(id))
      const matchMap: Record<string, MatchRecord> = {}
      const eventsMap: Record<string, BallEvent[]> = {}

      for (const mId of matchIds) {
        const m = await repository.getMatch(mId)
        if (m) {
          matchMap[mId] = m
          const evts = await repository.getBallEvents(mId)
          eventsMap[mId] = evts
        }
      }
      setMatches(matchMap)
      setMatchEvents(eventsMap)

      const pList = await repository.listPlayers()
      setPlayers(pList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAllData()
  }, [tournamentId])

  const teamsById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of teams) {
      map[t.teamId] = t.nameSnapshot
      map[t.id] = t.nameSnapshot
    }
    return map
  }, [teams])

  // Derive standings dynamically (Pure function - never stored as source of truth)
  const standingsByGroup = useMemo(() => {
    if (!tournament) return {}
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
    return deriveTournamentStandings(tournament, teams, fixtures, resultsMap)
  }, [tournament, teams, fixtures, matches, matchEvents])

  const standings = useMemo(() => {
    return Object.values(standingsByGroup).flat()
  }, [standingsByGroup])

  const groupedStandings = useMemo(() => {
    if (!tournament || tournament.format !== 'groups_knockout') return null
    return standingsByGroup
  }, [tournament, standingsByGroup])

  // Derive tournament stats
  const tournamentStats = useMemo(() => {
    return computeTournamentStats(fixtures, matchEvents, matches, teams, players)
  }, [fixtures, matchEvents, matches, teams, players])

  const handleCopyShareLink = () => {
    if (!tournament?.shareToken) return
    const url = `${window.location.origin}/t/${tournament.shareToken}`
    void navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleSaveResultOverride = async () => {
    if (!overrideFixture) return
    const overrideType =
      overrideReason === 'abandoned_no_result'
        ? 'abandoned'
        : overrideReason === 'walkover'
          ? 'walkover'
          : overrideReason === 'tied_super_over'
            ? 'tie_decided_manually'
            : 'revised_target'

    const override: ResultOverride = {
      type: overrideType,
      winnerTeamId:
        overrideReason === 'abandoned_no_result' ? undefined : overrideWinnerId || undefined,
      note:
        overrideNotes ||
        (overrideReason === 'walkover'
          ? 'Walkover granted'
          : overrideReason === 'abandoned_no_result'
            ? 'Match abandoned due to rain'
            : 'Result override'),
    }

    await repository.updateFixture(overrideFixture.id, {
      resultOverride: override,
      status: overrideReason === 'abandoned_no_result' ? 'abandoned' : 'completed',
    })

    // Advance knockout winner if bracket match
    if (
      overrideFixture.winnerAdvancesToFixtureId &&
      override.winnerTeamId &&
      tournament
    ) {
      const { fixtures: updatedFixtures } = advanceKnockoutWinner(
        fixtures,
        overrideFixture.id,
        override.winnerTeamId,
      )
      await repository.saveFixtures(updatedFixtures)
    }

    setOverrideFixture(null)
    setOverrideNotes('')
    void loadAllData()
  }

  const handleDownloadStandingsCsv = () => {
    if (!tournament) return
    const csv = exportStandingsToCsv(standings, tournament.name)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tournament.name.replace(/\s+/g, '_')}_Standings.csv`
    a.click()
  }

  const handleDownloadFixturesCsv = () => {
    if (!tournament) return
    const csv = exportFixturesToCsv(fixtures, teamsById, tournament.name)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tournament.name.replace(/\s+/g, '_')}_Fixtures.csv`
    a.click()
  }

  if (loading || !tournament) {
    return (
      <div className="min-h-screen bg-[#080C0E] text-white flex items-center justify-center text-sm text-slate-400">
        Loading tournament dashboard...
      </div>
    )
  }

  const isKnockoutFormat =
    tournament.format === 'knockout' || tournament.format === 'groups_knockout'

  return (
    <div className="min-h-screen bg-[#080C0E] text-white p-4 max-w-4xl mx-auto flex flex-col gap-5 pb-20">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-[#121A1D] border border-[#233238] text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/60">
                {tournament.format.replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {tournament.oversPerInnings} Overs • {tournament.playersPerSide} Aside
              </span>
            </div>
            <h1 className="text-xl font-black text-white mt-0.5">{tournament.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyShareLink}
            className="px-3 py-1.5 rounded-xl bg-[#182328] border border-[#28383F] hover:border-amber-500 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
            title="Copy Public Link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Copied!' : 'Public Link'}
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold transition"
            title="Share Graphic Card"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-[#233238] no-scrollbar">
        {[
          { id: 'fixtures', label: 'Fixtures', icon: Calendar },
          { id: 'standings', label: 'Points Table', icon: BarChart2 },
          ...(isKnockoutFormat ? [{ id: 'bracket', label: 'Brackets', icon: GitBranch }] : []),
          { id: 'stats', label: 'Leaderboards', icon: Award },
          { id: 'teams', label: 'Teams', icon: Users },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
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

      {/* TAB 1: FIXTURES */}
      {activeTab === 'fixtures' && (
        <div className="flex flex-col gap-4">
          {/* Stage filters */}
          {isKnockoutFormat && (
            <div className="flex gap-2">
              {(['all', 'group', 'knockout'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFixtureStageFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize border transition ${
                    fixtureStageFilter === filter
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400'
                      : 'bg-[#121A1D] border-[#233238] text-slate-400'
                  }`}
                >
                  {filter} matches
                </button>
              ))}
            </div>
          )}

          {/* Fixtures List */}
          <div className="flex flex-col gap-3">
            {fixtures
              .filter((f) => fixtureStageFilter === 'all' || f.stage === fixtureStageFilter)
              .map((fix, idx) => {
                const t1Name = fix.homeTeamId ? teamsById[fix.homeTeamId] ?? fix.homeTeamId : 'TBD'
                const t2Name = fix.awayTeamId ? teamsById[fix.awayTeamId] ?? fix.awayTeamId : 'TBD'
                const isLive = fix.status === 'live'
                const isCompleted = fix.status === 'completed'
                const isAbandoned = fix.status === 'abandoned'
                const match = fix.matchId ? matches[fix.matchId] : null
                const events = fix.matchId ? matchEvents[fix.matchId] ?? [] : []
                const roundName =
                  fix.stage === 'league' || fix.stage === 'group'
                    ? `Round ${fix.round}`
                    : fix.stage.replace('_', ' ').toUpperCase()

                // Derived match result
                let resultSummary = fix.resultOverride?.note
                if (!resultSummary && match && events.length > 0) {
                  const derived = deriveTournamentResult(
                    fix,
                    match.config,
                    events,
                    fix.homeTeamId ?? '',
                    fix.awayTeamId ?? '',
                  )
                  resultSummary = derived.marginText
                }

                return (
                  <div
                    key={fix.id}
                    className={`bg-[#121A1D] border rounded-2xl p-4 flex flex-col gap-3 transition ${
                      isLive
                        ? 'border-rose-500/60 shadow-lg shadow-rose-950/20'
                        : isCompleted
                          ? 'border-[#233238]'
                          : 'border-[#233238] hover:border-[#384c55]'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-300">Match #{idx + 1}</span>
                        <span>•</span>
                        <span>{roundName}</span>
                        {fix.groupId && (
                          <span className="bg-slate-800 text-[10px] px-1.5 py-0.5 rounded text-slate-300">
                            Group {fix.groupId}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isLive && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Live
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-bold text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                            Completed
                          </span>
                        )}
                        {isAbandoned && (
                          <span className="text-[10px] font-bold text-amber-400 uppercase bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                            Abandoned / No Result
                          </span>
                        )}
                        {!isLive && !isCompleted && !isAbandoned && (
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">
                            Scheduled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Teams Display */}
                    <div className="flex justify-between items-center py-1">
                      <div className="flex-1 font-bold text-base text-slate-100 truncate">
                        {t1Name}
                      </div>
                      <div className="px-3 text-xs font-black text-amber-400 font-mono">VS</div>
                      <div className="flex-1 font-bold text-base text-slate-100 text-right truncate">
                        {t2Name}
                      </div>
                    </div>

                    {/* Result or Override Display */}
                    {resultSummary && (
                      <div className="p-2 rounded-xl bg-[#182328] border border-[#28383F] text-xs font-medium text-amber-300 text-center">
                        {resultSummary}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center border-t border-[#233238] pt-2.5">
                      <button
                        onClick={() => {
                          setOverrideFixture(fix)
                          setOverrideWinnerId(fix.homeTeamId ?? '')
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-200 transition"
                      >
                        Override / Walkover
                      </button>

                      <div className="flex items-center gap-2">
                        {fix.matchId && (
                          <button
                            onClick={() => onViewMatchScorecard(fix.matchId!)}
                            className="px-3 py-1.5 rounded-xl bg-[#182328] hover:bg-[#233238] text-xs font-semibold text-slate-200 flex items-center gap-1 transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Scorecard
                          </button>
                        )}

                        {fix.status !== 'completed' && fix.status !== 'abandoned' && (
                          <button
                            onClick={() => onScoreFixture(fix, t1Name, t2Name)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 fill-black" />
                            {fix.matchId ? 'Resume Scoring' : 'Score Match'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* TAB 2: POINTS TABLE */}
      {activeTab === 'standings' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-white">Live Points Table</h2>
              <p className="text-xs text-slate-400">
                Click any team row to inspect full Base-6 NRR formula audit.
              </p>
            </div>
            <button
              onClick={handleDownloadStandingsCsv}
              className="px-3 py-1.5 rounded-xl bg-[#182328] border border-[#28383F] hover:border-amber-500 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>

          {/* Render Groups or Single Standings */}
          {groupedStandings ? (
            Object.entries(groupedStandings).map(([groupName, groupRows]) => (
              <div
                key={groupName}
                className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Group {groupName}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    (Top {tournament.qualifiersPerGroup ?? 2} qualify)
                  </span>
                </div>
                {renderStandingsTable(groupRows, tournament.qualifiersPerGroup ?? 2, setSelectedAuditRow)}
              </div>
            ))
          ) : (
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4">
              {renderStandingsTable(standings, 4, setSelectedAuditRow)}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BRACKETS (Knockout Tree) */}
      {activeTab === 'bracket' && isKnockoutFormat && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-white">Knockout Progression Bracket</h2>
              <p className="text-xs text-slate-400">
                Single-elimination tree. Winners advance automatically upon match completion.
              </p>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
            {(['quarter', 'semi', 'final', 'third_place'] as const).map((stageName) => {
              const stageFixtures = fixtures.filter((f) => f.stage === stageName)
              if (stageFixtures.length === 0) return null

              return (
                <div key={stageName} className="flex flex-col gap-3 min-w-[240px]">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 pb-1 border-b border-[#233238]">
                    {stageName.replace('_', ' ')}
                  </span>
                  {stageFixtures.map((f, sIdx) => {
                    const home = f.homeTeamId ? teamsById[f.homeTeamId] ?? 'TBD' : 'TBD'
                    const away = f.awayTeamId ? teamsById[f.awayTeamId] ?? 'TBD' : 'TBD'
                    const isCompleted = f.status === 'completed'
                    const isLive = f.status === 'live'

                    return (
                      <div
                        key={f.id}
                        className={`bg-[#121A1D] border rounded-2xl p-3 flex flex-col gap-2 transition ${
                          isLive
                            ? 'border-rose-500/60 shadow-lg'
                            : isCompleted
                              ? 'border-emerald-800/40'
                              : 'border-[#233238]'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>Match #{sIdx + 1}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded uppercase font-bold text-[9px] ${
                              isCompleted
                                ? 'bg-emerald-950 text-emerald-400'
                                : isLive
                                  ? 'bg-rose-950 text-rose-400'
                                  : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {f.status}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex justify-between items-center font-bold text-slate-200">
                            <span className="truncate">{home}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono text-center">vs</div>
                          <div className="flex justify-between items-center font-bold text-slate-200">
                            <span className="truncate">{away}</span>
                          </div>
                        </div>

                        {f.status !== 'completed' && (
                          <button
                            onClick={() => onScoreFixture(f, home, away)}
                            className="mt-1 w-full py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                          >
                            <Play className="w-3 h-3 fill-emerald-400" />
                            Score
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 4: STATS & LEADERBOARDS */}
      {activeTab === 'stats' && (
        <div className="flex flex-col gap-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-3 text-center">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                Matches Played
              </span>
              <span className="text-xl font-black text-amber-400 font-mono mt-0.5 block">
                {tournamentStats.summary.matchesPlayed}
              </span>
            </div>
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-3 text-center">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                Total Runs
              </span>
              <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
                {tournamentStats.summary.totalRuns}
              </span>
            </div>
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-3 text-center">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                Total Wickets
              </span>
              <span className="text-xl font-black text-rose-400 font-mono mt-0.5 block">
                {tournamentStats.summary.totalWickets}
              </span>
            </div>
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-3 text-center">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                Total Sixes
              </span>
              <span className="text-xl font-black text-purple-400 font-mono mt-0.5 block">
                {tournamentStats.summary.totalSixes}
              </span>
            </div>
          </div>

          {/* Orange Cap & Purple Cap side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Orange Cap */}
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#233238]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Orange Cap (Most Runs)</h3>
                    <p className="text-[10px] text-slate-400">Top tournament run-scorers</p>
                  </div>
                </div>
              </div>

              {tournamentStats.orangeCap.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No batting data yet. Complete matches to populate.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {tournamentStats.orangeCap.slice(0, 5).map((row, idx) => (
                    <div
                      key={row.playerId}
                      className="flex justify-between items-center bg-[#182328] px-3 py-2 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-amber-400 w-4">#{idx + 1}</span>
                        <div>
                          <span className="font-bold text-slate-200 block">{row.playerName}</span>
                          <span className="text-[10px] text-slate-500">
                            {row.teamName || 'Independent'} • {row.innings} inn • SR {row.strikeRate}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black font-mono text-sm text-white">
                          {row.runs}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {row.fours} 4s • {row.sixes} 6s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Purple Cap */}
            <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-[#233238]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Purple Cap (Most Wickets)</h3>
                    <p className="text-[10px] text-slate-400">Top tournament wicket-takers</p>
                  </div>
                </div>
              </div>

              {tournamentStats.purpleCap.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No bowling data yet. Complete matches to populate.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {tournamentStats.purpleCap.slice(0, 5).map((row, idx) => (
                    <div
                      key={row.playerId}
                      className="flex justify-between items-center bg-[#182328] px-3 py-2 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-purple-400 w-4">#{idx + 1}</span>
                        <div>
                          <span className="font-bold text-slate-200 block">{row.playerName}</span>
                          <span className="text-[10px] text-slate-500">
                            {row.teamName || 'Independent'} • {row.oversFormatted} ov • Econ{' '}
                            {row.economy}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black font-mono text-sm text-white">
                          {row.wickets} wkt
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          BBI {row.bestFiguresFormatted}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MVP Table */}
          <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white">Tournament MVP Leaderboard</h3>
            {tournamentStats.mvpLeaderboard.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                No MVP data yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tournamentStats.mvpLeaderboard.slice(0, 6).map((m, idx) => (
                  <div
                    key={m.playerId}
                    className="flex justify-between items-center bg-[#182328] p-3 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">#{idx + 1}</span>
                      <div>
                        <span className="font-bold text-slate-200 block">{m.playerName}</span>
                        <span className="text-[10px] text-slate-500">{m.teamName}</span>
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono text-amber-400">
                      {m.mvpPoints} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: TEAMS */}
      {activeTab === 'teams' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white">Registered Teams ({teams.length})</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teams.map((t, idx) => (
              <div
                key={t.id}
                className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-amber-400 font-mono">
                      Seed #{t.seed ?? idx + 1}
                    </span>
                    {t.groupId && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                        Group {t.groupId}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">{t.nameSnapshot}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-5 flex flex-col gap-5">
          <h2 className="text-base font-bold text-white">Tournament Settings & Exports</h2>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Data Exports
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadStandingsCsv}
                className="px-4 py-2 rounded-xl bg-[#182328] border border-[#28383F] hover:border-amber-500 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download Standings CSV
              </button>
              <button
                onClick={handleDownloadFixturesCsv}
                className="px-4 py-2 rounded-xl bg-[#182328] border border-[#28383F] hover:border-amber-500 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download Fixtures CSV
              </button>
            </div>
          </div>

          <div className="border-t border-[#233238] pt-4">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
              Public Share Token
            </span>
            <div className="flex items-center gap-2 bg-[#0D1417] p-2.5 rounded-xl border border-[#233238]">
              <span className="font-mono text-xs text-slate-400 truncate flex-1">
                {window.location.origin}/t/{tournament.shareToken}
              </span>
              <button
                onClick={handleCopyShareLink}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center gap-1 transition"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Override Dialog */}
      {overrideFixture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121A1D] border border-[#233238] rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white">Manual Result Override</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {overrideFixture.homeTeamId ? teamsById[overrideFixture.homeTeamId] : 'Home'} vs{' '}
              {overrideFixture.awayTeamId ? teamsById[overrideFixture.awayTeamId] : 'Away'}
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">Decision Type</label>
              <select
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-[#182328] border border-[#28383F] text-xs text-white"
              >
                <option value="walkover">Walkover (Forfeit)</option>
                <option value="abandoned_no_result">Abandoned (Rain / No Result)</option>
                <option value="tied_super_over">Tied / Super Over Decided</option>
                <option value="revised_target">Revised Target (DLS / Rain)</option>
              </select>
            </div>

            {overrideReason !== 'abandoned_no_result' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300">Select Winner</label>
                <select
                  value={overrideWinnerId}
                  onChange={(e) => setOverrideWinnerId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[#182328] border border-[#28383F] text-xs text-white"
                >
                  {overrideFixture.homeTeamId && (
                    <option value={overrideFixture.homeTeamId}>
                      {teamsById[overrideFixture.homeTeamId]}
                    </option>
                  )}
                  {overrideFixture.awayTeamId && (
                    <option value={overrideFixture.awayTeamId}>
                      {teamsById[overrideFixture.awayTeamId]}
                    </option>
                  )}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">Notes / Margin</label>
              <input
                type="text"
                placeholder="e.g. Team forfeited due to delay"
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#182328] border border-[#28383F] text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setOverrideFixture(null)}
                className="px-3 py-1.5 rounded-lg bg-[#182328] text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveResultOverride}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold"
              >
                Save Override
              </button>
            </div>
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

      {/* Tournament Share Card Modal */}
      {showShareModal && (
        <TournamentShareCardModal
          tournament={tournament}
          standings={standings}
          fixtures={fixtures}
          teamsById={teamsById}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}

function renderStandingsTable(
  rows: TeamStandingsRow[],
  qualifiersCount: number,
  onRowClick: (row: TeamStandingsRow) => void,
) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#233238] text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <th className="py-2.5 px-2 text-center">#</th>
            <th className="py-2.5 px-2">Team</th>
            <th className="py-2.5 px-2 text-center">P</th>
            <th className="py-2.5 px-2 text-center">W</th>
            <th className="py-2.5 px-2 text-center">L</th>
            <th className="py-2.5 px-2 text-center">T</th>
            <th className="py-2.5 px-2 text-center">NR</th>
            <th className="py-2.5 px-2 text-center font-bold text-amber-400">Pts</th>
            <th className="py-2.5 px-2 text-right">NRR</th>
            <th className="py-2.5 px-2 text-center">Form</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#182328]">
          {rows.map((r, idx) => {
            const isQualified = idx < qualifiersCount
            return (
              <tr
                key={r.teamId}
                onClick={() => onRowClick(r)}
                className={`cursor-pointer transition hover:bg-[#182328] ${
                  isQualified ? 'bg-emerald-950/10' : ''
                }`}
              >
                <td className="py-3 px-2 text-center font-mono font-bold text-slate-400">
                  {idx + 1}
                </td>
                <td className="py-3 px-2 font-bold text-slate-100 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {isQualified && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    <span>{r.teamName}</span>
                  </div>
                </td>
                <td className="py-3 px-2 text-center font-mono text-slate-300">{r.played}</td>
                <td className="py-3 px-2 text-center font-mono text-emerald-400 font-semibold">
                  {r.won}
                </td>
                <td className="py-3 px-2 text-center font-mono text-rose-400">{r.lost}</td>
                <td className="py-3 px-2 text-center font-mono text-slate-400">{r.tied}</td>
                <td className="py-3 px-2 text-center font-mono text-slate-400">{r.noResult}</td>
                <td className="py-3 px-2 text-center font-mono font-black text-amber-400 text-sm">
                  {r.points}
                </td>
                <td
                  className={`py-3 px-2 text-right font-mono font-semibold ${
                    r.nrr > 0 ? 'text-emerald-400' : r.nrr < 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}
                >
                  {r.nrrText}
                </td>
                <td className="py-3 px-2 text-center whitespace-nowrap">
                  <div className="flex justify-center gap-1">
                    {r.last5Form.length === 0 ? (
                      <span className="text-[10px] text-slate-600">-</span>
                    ) : (
                      r.last5Form.map((res: 'W' | 'L' | 'T' | 'N', fIdx: number) => (
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
                      ))
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
