import type { BallEvent, MatchConfig } from '../engine/types'
import type { MatchRecord, PlayerRecord } from '../db/schema'
import type { Fixture, TournamentTeam } from './types'
import { deriveInningsBatting } from '../stats/batting'
import { deriveInningsBowling } from '../stats/bowling'
import { calculatePlayerMvp } from '../stats/mvp'

export interface TournamentBatterLeaderboardRow {
  playerId: string
  playerName: string
  teamId: string
  teamName: string
  matches: number
  innings: number
  runs: number
  balls: number
  fours: number
  sixes: number
  strikeRate: number
  highestScore: number
  notOuts: number
}

export interface TournamentBowlerLeaderboardRow {
  playerId: string
  playerName: string
  teamId: string
  teamName: string
  matches: number
  innings: number
  legalBalls: number
  oversFormatted: string
  wickets: number
  runsConceded: number
  economy: number
  bestWickets: number
  bestRuns: number
  bestFiguresFormatted: string
}

export interface TournamentMvpRow {
  playerId: string
  playerName: string
  teamId: string
  teamName: string
  mvpPoints: number
  matches: number
}

export interface TournamentOverallSummary {
  matchesPlayed: number
  totalRuns: number
  totalWickets: number
  totalSixes: number
  totalFours: number
  averageFirstInningsScore: number
}

export interface TournamentStatsResult {
  orangeCap: TournamentBatterLeaderboardRow[]
  purpleCap: TournamentBowlerLeaderboardRow[]
  mostSixes: TournamentBatterLeaderboardRow[]
  mvpLeaderboard: TournamentMvpRow[]
  summary: TournamentOverallSummary
}

export function computeTournamentStats(
  fixtures: Fixture[],
  matchesEvents: Record<string, BallEvent[]>,
  matchesRecords: Record<string, MatchRecord>,
  teams: TournamentTeam[],
  players: PlayerRecord[],
): TournamentStatsResult {
  const teamMap = new Map<string, string>()
  for (const t of teams) {
    teamMap.set(t.id, t.nameSnapshot)
    if (t.teamId) {
      teamMap.set(t.teamId, t.nameSnapshot)
    }
  }

  const playerMap = new Map<string, { name: string; teamId: string }>()
  for (const p of players) {
    playerMap.set(p.id, {
      name: p.name,
      teamId: p.teamId ?? '',
    })
  }

  // Fallback player resolver
  const getPlayerInfo = (playerId: string) => {
    const existing = playerMap.get(playerId)
    if (existing) return existing
    return { name: playerId, teamId: '' }
  }

  const completedFixtures = fixtures.filter((f) => f.matchId && matchesRecords[f.matchId])

  // Aggregation maps
  interface AggBatter {
    playerId: string
    matchesSet: Set<string>
    inningsCount: number
    runs: number
    balls: number
    fours: number
    sixes: number
    highestScore: number
    notOuts: number
  }

  interface AggBowler {
    playerId: string
    matchesSet: Set<string>
    inningsCount: number
    legalBalls: number
    wickets: number
    runsConceded: number
    bestWickets: number
    bestRuns: number
  }

  const batterAgg = new Map<string, AggBatter>()
  const bowlerAgg = new Map<string, AggBowler>()
  const mvpAgg = new Map<string, { points: number; matchesSet: Set<string> }>()

  let totalRuns = 0
  let totalWickets = 0
  let totalSixes = 0
  let totalFours = 0
  let firstInningsRunsSum = 0
  let firstInningsMatchesCount = 0

  for (const fix of completedFixtures) {
    const matchId = fix.matchId!
    const match = matchesRecords[matchId]
    if (!match) continue
    const events = matchesEvents[matchId] ?? []
    if (events.length === 0) continue

    const config: MatchConfig = match.config

    // 1st innings stats
    const bInn1 = deriveInningsBatting(events, matchId, 1)
    const bowlInn1 = deriveInningsBowling(events, matchId, 1, config)

    // 2nd innings stats
    const bInn2 = deriveInningsBatting(events, matchId, 2)
    const bowlInn2 = deriveInningsBowling(events, matchId, 2, config)

    // First innings runs
    let inn1Runs = 0
    for (const b of Object.values(bInn1)) {
      inn1Runs += b.runs
    }
    // Also include extras in inn1
    const inn1Extras = events
      .filter((e) => e.inningsNo === 1 && (e.extra?.runs ?? 0) > 0)
      .reduce((sum, e) => sum + (e.extra?.runs ?? 0), 0)
    inn1Runs += inn1Extras
    if (inn1Runs > 0) {
      firstInningsRunsSum += inn1Runs
      firstInningsMatchesCount++
    }

    // Process Batters
    const processBatterInnings = (innMap: typeof bInn1) => {
      for (const [pid, b] of Object.entries(innMap)) {
        let agg = batterAgg.get(pid)
        if (!agg) {
          agg = {
            playerId: pid,
            matchesSet: new Set(),
            inningsCount: 0,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            highestScore: 0,
            notOuts: 0,
          }
          batterAgg.set(pid, agg)
        }
        agg.matchesSet.add(matchId)
        agg.inningsCount++
        agg.runs += b.runs
        agg.balls += b.ballsFaced
        agg.fours += b.fours
        agg.sixes += b.sixes
        if (b.runs > agg.highestScore) {
          agg.highestScore = b.runs
        }
        if (!b.isOut) {
          agg.notOuts++
        }
        totalRuns += b.runs
        totalFours += b.fours
        totalSixes += b.sixes
      }
    }

    processBatterInnings(bInn1)
    processBatterInnings(bInn2)

    // Process Bowlers
    const processBowlerInnings = (innMap: typeof bowlInn1) => {
      for (const [pid, b] of Object.entries(innMap)) {
        let agg = bowlerAgg.get(pid)
        if (!agg) {
          agg = {
            playerId: pid,
            matchesSet: new Set(),
            inningsCount: 0,
            legalBalls: 0,
            wickets: 0,
            runsConceded: 0,
            bestWickets: 0,
            bestRuns: 9999,
          }
          bowlerAgg.set(pid, agg)
        }
        agg.matchesSet.add(matchId)
        agg.inningsCount++
        agg.legalBalls += b.ballsBowled
        agg.wickets += b.wickets
        agg.runsConceded += b.runsConceded
        totalWickets += b.wickets

        // Best bowling figures logic
        if (
          b.wickets > agg.bestWickets ||
          (b.wickets === agg.bestWickets && b.runsConceded < agg.bestRuns)
        ) {
          agg.bestWickets = b.wickets
          agg.bestRuns = b.runsConceded
        }
      }
    }

    processBowlerInnings(bowlInn1)
    processBowlerInnings(bowlInn2)

    // Calculate MVP for players involved in this match
    const distinctPlayerIds = new Set<string>()
    for (const e of events) {
      if (e.batterId) distinctPlayerIds.add(e.batterId)
      if (e.nonStrikerId) distinctPlayerIds.add(e.nonStrikerId)
      if (e.bowlerId) distinctPlayerIds.add(e.bowlerId)
      if (e.wicket?.fielderId) distinctPlayerIds.add(e.wicket.fielderId)
    }

    for (const pid of distinctPlayerIds) {
      const mvp = calculatePlayerMvp(events, config, matchId, pid)
      let mAgg = mvpAgg.get(pid)
      if (!mAgg) {
        mAgg = { points: 0, matchesSet: new Set() }
        mvpAgg.set(pid, mAgg)
      }
      mAgg.points += mvp.totalPoints
      mAgg.matchesSet.add(matchId)
    }
  }

  // Format batters
  const batterRows: TournamentBatterLeaderboardRow[] = Array.from(batterAgg.values()).map((b) => {
    const info = getPlayerInfo(b.playerId)
    const teamName = teamMap.get(info.teamId) ?? ''
    const strikeRate = b.balls > 0 ? Number(((b.runs / b.balls) * 100).toFixed(1)) : 0
    return {
      playerId: b.playerId,
      playerName: info.name,
      teamId: info.teamId,
      teamName,
      matches: b.matchesSet.size,
      innings: b.inningsCount,
      runs: b.runs,
      balls: b.balls,
      fours: b.fours,
      sixes: b.sixes,
      strikeRate,
      highestScore: b.highestScore,
      notOuts: b.notOuts,
    }
  })

  // Orange Cap: Sorted by runs desc, then strikeRate desc
  const orangeCap = [...batterRows].sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate)

  // Most Sixes: Sorted by sixes desc, then runs desc
  const mostSixes = [...batterRows]
    .filter((b) => b.sixes > 0)
    .sort((a, b) => b.sixes - a.sixes || b.runs - a.runs)

  // Format bowlers
  const bowlerRows: TournamentBowlerLeaderboardRow[] = Array.from(bowlerAgg.values()).map((b) => {
    const info = getPlayerInfo(b.playerId)
    const teamName = teamMap.get(info.teamId) ?? ''
    const completedOvers = Math.floor(b.legalBalls / 6)
    const remBalls = b.legalBalls % 6
    const oversFormatted = `${completedOvers}.${remBalls}`
    const economy =
      b.legalBalls > 0 ? Number(((b.runsConceded / b.legalBalls) * 6).toFixed(2)) : 0

    const bestFiguresFormatted =
      b.bestWickets > 0 || b.bestRuns < 9999 ? `${b.bestWickets}/${b.bestRuns}` : '-'

    return {
      playerId: b.playerId,
      playerName: info.name,
      teamId: info.teamId,
      teamName,
      matches: b.matchesSet.size,
      innings: b.inningsCount,
      legalBalls: b.legalBalls,
      oversFormatted,
      wickets: b.wickets,
      runsConceded: b.runsConceded,
      economy,
      bestWickets: b.bestWickets,
      bestRuns: b.bestRuns,
      bestFiguresFormatted,
    }
  })

  // Purple Cap: Sorted by wickets desc, then economy asc
  const purpleCap = [...bowlerRows].sort((a, b) => b.wickets - a.wickets || a.economy - b.economy)

  // MVP Leaderboard: Sorted by points desc
  const mvpLeaderboard: TournamentMvpRow[] = Array.from(mvpAgg.entries())
    .map(([pid, m]) => {
      const info = getPlayerInfo(pid)
      const teamName = teamMap.get(info.teamId) ?? ''
      return {
        playerId: pid,
        playerName: info.name,
        teamId: info.teamId,
        teamName,
        mvpPoints: Number(m.points.toFixed(1)),
        matches: m.matchesSet.size,
      }
    })
    .sort((a, b) => b.mvpPoints - a.mvpPoints)

  const summary: TournamentOverallSummary = {
    matchesPlayed: completedFixtures.length,
    totalRuns,
    totalWickets,
    totalSixes,
    totalFours,
    averageFirstInningsScore:
      firstInningsMatchesCount > 0
        ? Math.round(firstInningsRunsSum / firstInningsMatchesCount)
        : 0,
  }

  return {
    orangeCap,
    purpleCap,
    mostSixes,
    mvpLeaderboard,
    summary,
  }
}
