import type { BallEvent } from '../engine/types'
import type { MatchRecord, PlayerRecord } from '../db/schema'
import { deriveInningsBatting, deriveCareerBatting } from './batting'
import { deriveInningsBowling, deriveCareerBowling } from './bowling'
import { deriveFieldingStats } from './fielding'
import { calculatePlayerMvp } from './mvp'
import type {
  PlayerCareerStats,
  PlayerRole,
  BattingInningsStats,
  BowlingInningsStats,
} from './types'

export function derivePlayerRole(
  ballsFaced: number,
  ballsBowled: number,
): PlayerRole {
  if (ballsFaced >= 30 && ballsBowled >= 30) {
    return 'all_rounder'
  }
  if (ballsFaced >= 30 && ballsBowled < 30) {
    return 'batter'
  }
  if (ballsBowled >= 30 && ballsFaced < 30) {
    return 'bowler'
  }
  return 'player'
}

export function derivePlayerCareer(
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
  const allEventsForPlayer: BallEvent[] = []
  const recentScores: number[] = []
  const recentBowlingFigures: string[] = []
  let totalMvpPoints = 0
  let matchesCount = 0

  for (const m of filteredMatches) {
    const events = eventsByMatchId[m.id] ?? []
    if (events.length === 0) continue

    // Check if player participated in this match
    const bInn1 = deriveInningsBatting(events, m.id, 1)[playerId]
    const bInn2 = deriveInningsBatting(events, m.id, 2)[playerId]
    const bowlInn1 = deriveInningsBowling(events, m.id, 1, m.config)[playerId]
    const bowlInn2 = deriveInningsBowling(events, m.id, 2, m.config)[playerId]

    const playerInMatch =
      Boolean(bInn1 || bInn2 || bowlInn1 || bowlInn2) ||
      events.some(
        (e) =>
          e.batterId === playerId ||
          e.nonStrikerId === playerId ||
          e.bowlerId === playerId ||
          e.wicket?.fielderId === playerId,
      )

    if (playerInMatch) {
      matchesCount++
      allEventsForPlayer.push(...events)

      if (bInn1) {
        battingInningsList.push(bInn1)
        recentScores.push(bInn1.runs)
      }
      if (bInn2) {
        battingInningsList.push(bInn2)
        recentScores.push(bInn2.runs)
      }

      if (bowlInn1) {
        bowlingInningsList.push(bowlInn1)
        if (bowlInn1.ballsBowled > 0) {
          recentBowlingFigures.push(`${bowlInn1.wickets}/${bowlInn1.runsConceded}`)
        }
      }
      if (bowlInn2) {
        bowlingInningsList.push(bowlInn2)
        if (bowlInn2.ballsBowled > 0) {
          recentBowlingFigures.push(`${bowlInn2.wickets}/${bowlInn2.runsConceded}`)
        }
      }

      const mvp = calculatePlayerMvp(events, m.config, m.id, playerId)
      totalMvpPoints += mvp.totalPoints
    }
  }

  const batting = deriveCareerBatting(battingInningsList, playerId)
  const bowling = deriveCareerBowling(bowlingInningsList, playerId)
  const fielding = deriveFieldingStats(allEventsForPlayer, playerId)
  const role = derivePlayerRole(batting.ballsFaced, bowling.ballsBowled)

  return {
    player,
    role,
    matchesCount,
    batting,
    bowling,
    fielding,
    recentScores: recentScores.slice(-10), // Last 10 innings
    recentBowlingFigures: recentBowlingFigures.slice(-10),
    mvpPoints: totalMvpPoints,
  }
}
