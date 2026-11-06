import { describe, it, expect } from 'vitest'
import { computeTournamentStats } from '../stats'
import type { Fixture, TournamentTeam } from '../types'
import type { BallEvent, MatchConfig } from '../../engine/types'
import type { MatchRecord, PlayerRecord } from '../../db/schema'

describe('Tournament Stats & Leaderboards Derivation', () => {
  const config: MatchConfig = {
    oversPerInnings: 2,
    playersPerSide: 4,
    wideReBowl: true,
    noBallFreeHit: true,
    lastManStands: false,
  }

  const teams: TournamentTeam[] = [
    { id: 't1', tournamentId: 'tourn-1', nameSnapshot: 'Warriors', teamId: 'team-1' },
    { id: 't2', tournamentId: 'tourn-1', nameSnapshot: 'Titans', teamId: 'team-2' },
  ]

  const players: PlayerRecord[] = [
    { id: 'p1', name: 'Virat', teamId: 'team-1' },
    { id: 'p2', name: 'Rohit', teamId: 'team-1' },
    { id: 'p3', name: 'Bumrah', teamId: 'team-2' },
    { id: 'p4', name: 'Shami', teamId: 'team-2' },
  ]

  const match1: MatchRecord = {
    id: 'm1',
    date: '2026-01-01',
    config,
    teamAId: 'team-1',
    teamBId: 'team-2',
    tossWinnerId: 'team-1',
    tossDecision: 'bat',
    currentInningsNo: 2,
    innings1BattingTeamId: 'team-1',
    innings1BowlingTeamId: 'team-2',
    innings2BattingTeamId: 'team-2',
    innings2BowlingTeamId: 'team-1',
    innings1Openers: {
      strikerId: 'p1',
      nonStrikerId: 'p2',
      bowlerId: 'p3',
    },
    status: 'completed',
    createdAt: 1,
    updatedAt: 1,
  }

  const fixture1: Fixture = {
    id: 'f1',
    tournamentId: 'tourn-1',
    round: 1,
    stage: 'group',
    homeTeamId: 't1',
    awayTeamId: 't2',
    matchId: 'm1',
    status: 'completed',
    createdAt: 1,
    updatedAt: 1,
  }

  const events1: BallEvent[] = [
    // Virat hits 6, 4 off Bumrah
    {
      id: 'e1',
      inningsNo: 1,
      batterId: 'p1',
      nonStrikerId: 'p2',
      bowlerId: 'p3',
      runsOffBat: 6,
      extra: null,
      wicket: null,
      isBoundary6: true,
      isBoundary4: false,
      timestamp: 1000,
    },
    {
      id: 'e2',
      inningsNo: 1,
      batterId: 'p1',
      nonStrikerId: 'p2',
      bowlerId: 'p3',
      runsOffBat: 4,
      extra: null,
      wicket: null,
      isBoundary6: false,
      isBoundary4: true,
      timestamp: 1001,
    },
    // Bumrah bowls Virat out
    {
      id: 'e3',
      inningsNo: 1,
      batterId: 'p1',
      nonStrikerId: 'p2',
      bowlerId: 'p3',
      runsOffBat: 0,
      extra: null,
      wicket: {
        type: 'bowled',
        playerOutId: 'p1',
      },
      isBoundary6: false,
      isBoundary4: false,
      timestamp: 1002,
    },
  ]

  it('computes Orange Cap, Purple Cap, Most Sixes, and MVP correctly from tournament fixtures', () => {
    const stats = computeTournamentStats(
      [fixture1],
      { m1: events1 },
      { m1: match1 },
      teams,
      players,
    )

    // Check Orange Cap
    expect(stats.orangeCap.length).toBeGreaterThanOrEqual(1)
    const topBatter = stats.orangeCap[0]!
    expect(topBatter.playerId).toBe('p1')
    expect(topBatter.playerName).toBe('Virat')
    expect(topBatter.runs).toBe(10)
    expect(topBatter.sixes).toBe(1)
    expect(topBatter.fours).toBe(1)
    expect(topBatter.balls).toBe(3)

    // Check Purple Cap
    expect(stats.purpleCap.length).toBeGreaterThanOrEqual(1)
    const topBowler = stats.purpleCap[0]!
    expect(topBowler.playerId).toBe('p3')
    expect(topBowler.playerName).toBe('Bumrah')
    expect(topBowler.wickets).toBe(1)
    expect(topBowler.runsConceded).toBe(10)

    // Check Most Sixes
    expect(stats.mostSixes).toHaveLength(1)
    expect(stats.mostSixes[0]!.sixes).toBe(1)

    // Check MVP Leaderboard
    expect(stats.mvpLeaderboard.length).toBeGreaterThan(0)

    // Check Overall Summary
    expect(stats.summary.matchesPlayed).toBe(1)
    expect(stats.summary.totalRuns).toBe(10)
    expect(stats.summary.totalWickets).toBe(1)
    expect(stats.summary.totalSixes).toBe(1)
    expect(stats.summary.totalFours).toBe(1)
  })
})
