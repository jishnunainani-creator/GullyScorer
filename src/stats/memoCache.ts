import type { BallEvent } from '../engine/types'
import type { MatchRecord, PlayerRecord } from '../db/schema'
import { deriveInningsBatting } from './batting'
import { deriveInningsBowling } from './bowling'
import { deriveFieldingStats } from './fielding'
import { calculatePlayerMvp, sortMvpRankings } from './mvp'
import { deriveCareerBatting } from './batting'
import { deriveCareerBowling } from './bowling'
import { derivePlayerRole } from './career'
import type {
  BattingInningsStats,
  BowlingInningsStats,
  FieldingCareerStats,
  MvpBreakdown,
  PlayerCareerStats,
} from './types'

export const STATS_CACHE_VERSION = 1

export interface CachedMatchSummary {
  cacheKey: string
  version: number
  matchId: string
  batting: Record<number, Record<string, BattingInningsStats>>
  bowling: Record<number, Record<string, BowlingInningsStats>>
  fielding: Record<string, FieldingCareerStats>
  mvp: MvpBreakdown[]
}

const memoryMatchCache = new Map<string, CachedMatchSummary>()

export function getMatchCacheKey(match: MatchRecord, events: BallEvent[]): string {
  return `${match.id}:${events.length}:${match.updatedAt ?? match.createdAt ?? 0}`
}

export function getCachedMatchSummary(
  match: MatchRecord,
  events: BallEvent[],
): CachedMatchSummary {
  const key = getMatchCacheKey(match, events)
  const existing = memoryMatchCache.get(match.id)
  if (existing && existing.cacheKey === key && existing.version === STATS_CACHE_VERSION) {
    return existing
  }

  // Derive per-match aggregates once
  const batting: Record<number, Record<string, BattingInningsStats>> = {
    1: deriveInningsBatting(events, match.id, 1),
    2: deriveInningsBatting(events, match.id, 2),
  }

  const bowling: Record<number, Record<string, BowlingInningsStats>> = {
    1: deriveInningsBowling(events, match.id, 1, match.config),
    2: deriveInningsBowling(events, match.id, 2, match.config),
  }

  // Collect all player IDs present in events
  const playerIds = new Set<string>()
  for (const e of events) {
    if (e.batterId) playerIds.add(e.batterId)
    if (e.nonStrikerId) playerIds.add(e.nonStrikerId)
    if (e.bowlerId) playerIds.add(e.bowlerId)
    if (e.wicket?.fielderId) playerIds.add(e.wicket.fielderId)
    if (e.wicket?.playerOutId) playerIds.add(e.wicket.playerOutId)
  }

  const fielding: Record<string, FieldingCareerStats> = {}
  for (const pId of playerIds) {
    fielding[pId] = deriveFieldingStats(events, pId)
  }

  const mvpList = Array.from(playerIds).map((pId) =>
    calculatePlayerMvp(events, match.config, match.id, pId),
  )
  const sortedMvp = sortMvpRankings(mvpList)

  const summary: CachedMatchSummary = {
    cacheKey: key,
    version: STATS_CACHE_VERSION,
    matchId: match.id,
    batting,
    bowling,
    fielding,
    mvp: sortedMvp,
  }

  memoryMatchCache.set(match.id, summary)
  return summary
}

export function deriveMemoizedPlayerCareer(
  matches: MatchRecord[],
  eventsByMatchId: Record<string, BallEvent[]>,
  player: PlayerRecord,
  includeIncomplete = false,
): PlayerCareerStats {
  const playerId = player.id
  const filteredMatches = matches.filter((m) => {
    if (!includeIncomplete && m.status !== 'completed') {
      return false
    }
    return true
  })

  const battingInningsList: BattingInningsStats[] = []
  const bowlingInningsList: BowlingInningsStats[] = []
  const recentScores: number[] = []
  const recentBowlingFigures: string[] = []
  let totalCatches = 0
  let totalRunOuts = 0
  let totalStumpings = 0
  let totalMvpPoints = 0
  let matchesCount = 0

  for (const m of filteredMatches) {
    const events = eventsByMatchId[m.id] ?? []
    if (events.length === 0) continue

    const summary = getCachedMatchSummary(m, events)

    const b1 = summary.batting[1]?.[playerId]
    const b2 = summary.batting[2]?.[playerId]
    const bowl1 = summary.bowling[1]?.[playerId]
    const bowl2 = summary.bowling[2]?.[playerId]
    const f = summary.fielding[playerId]
    const mvp = summary.mvp.find((item) => item.playerId === playerId)

    const playerActive = Boolean(b1 || b2 || bowl1 || bowl2 || f || mvp)
    if (playerActive) {
      matchesCount++
      if (b1) {
        battingInningsList.push(b1)
        recentScores.push(b1.runs)
      }
      if (b2) {
        battingInningsList.push(b2)
        recentScores.push(b2.runs)
      }
      if (bowl1) {
        bowlingInningsList.push(bowl1)
        if (bowl1.ballsBowled > 0) {
          recentBowlingFigures.push(`${bowl1.wickets}/${bowl1.runsConceded}`)
        }
      }
      if (bowl2) {
        bowlingInningsList.push(bowl2)
        if (bowl2.ballsBowled > 0) {
          recentBowlingFigures.push(`${bowl2.wickets}/${bowl2.runsConceded}`)
        }
      }
      if (f) {
        totalCatches += f.catches
        totalRunOuts += f.runOuts
        totalStumpings += f.stumpings
      }
      if (mvp) {
        totalMvpPoints += mvp.totalPoints
      }
    }
  }

  const batting = deriveCareerBatting(battingInningsList, playerId)
  const bowling = deriveCareerBowling(bowlingInningsList, playerId)
  const role = derivePlayerRole(batting.ballsFaced, bowling.ballsBowled)

  return {
    player,
    role,
    matchesCount,
    batting,
    bowling,
    fielding: {
      playerId,
      catches: totalCatches,
      runOuts: totalRunOuts,
      stumpings: totalStumpings,
      totalDismissals: totalCatches + totalRunOuts + totalStumpings,
    },
    recentScores: recentScores.slice(-10),
    recentBowlingFigures: recentBowlingFigures.slice(-10),
    mvpPoints: totalMvpPoints,
  }
}

export function clearStatsMemoryCache(): void {
  memoryMatchCache.clear()
}
