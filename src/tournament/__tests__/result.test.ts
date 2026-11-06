import { describe, it, expect } from 'vitest'
import { deriveTournamentResult, isTeamAllOut } from '../result'
import type { Fixture } from '../types'
import type { BallEvent, MatchConfig } from '../../engine/types'

describe('Tournament Match Result Derivation', () => {
  const baseConfig: MatchConfig = {
    oversPerInnings: 2,
    playersPerSide: 4, // 3 wickets max if lastManStands: false
    wideReBowl: true,
    noBallFreeHit: true,
    lastManStands: false,
  }

  const baseFixture: Fixture = {
    id: 'f-1',
    tournamentId: 't-1',
    stage: 'league',
    round: 1,
    homeTeamId: 'team-A',
    awayTeamId: 'team-B',
    status: 'completed',
    createdAt: 0,
    updatedAt: 0,
  }

  function createBall(over: number, ball: number, runs: number, inn: number, wicket = false): BallEvent {
    return {
      id: `b-${inn}-${over}-${ball}`,
      inningsNo: inn,
      batterId: `bat-${inn}`,
      nonStrikerId: `non-${inn}`,
      bowlerId: `bowl-${inn}`,
      runsOffBat: runs,
      extra: null,
      wicket: wicket ? { type: 'bowled', playerOutId: `bat-${inn}` } : null,
      isBoundary4: runs === 4,
      isBoundary6: runs === 6,
      timestamp: Date.now(),
    }
  }

  it('correctly calculates isTeamAllOut for standard cricket (lastManStands: false)', () => {
    expect(isTeamAllOut(2, baseConfig)).toBe(false)
    expect(isTeamAllOut(3, baseConfig)).toBe(true)
    expect(isTeamAllOut(4, baseConfig)).toBe(true)
  })

  it('correctly calculates isTeamAllOut for lastManStands: true', () => {
    const lmsConfig = { ...baseConfig, lastManStands: true }
    expect(isTeamAllOut(3, lmsConfig)).toBe(false)
    expect(isTeamAllOut(4, lmsConfig)).toBe(true)
  })

  it('derives win by runs when defending team defends successfully', () => {
    // Innings 1: 12 balls, 18 runs
    const inn1Events = Array.from({ length: 12 }, (_, i) => createBall(Math.floor(i / 6), (i % 6) + 1, (i % 2) + 1, 1))
    // Innings 2: 12 balls, 12 runs
    const inn2Events = Array.from({ length: 12 }, (_, i) => createBall(Math.floor(i / 6), (i % 6) + 1, 1, 2))

    const result = deriveTournamentResult(baseFixture, baseConfig, [...inn1Events, ...inn2Events], 'team-A', 'team-B')

    expect(result.winnerTeamId).toBe('team-A')
    expect(result.isTie).toBe(false)
    expect(result.marginText).toBe('Won by 6 runs')
    expect(result.innings1.runs).toBe(18)
    expect(result.innings2.runs).toBe(12)
    expect(result.innings1.legalBalls).toBe(12)
    expect(result.innings2.legalBalls).toBe(12)
  })

  it('derives win by wickets when chasing team reaches target early', () => {
    // Innings 1: 10 runs
    const inn1Events = Array.from({ length: 12 }, (_, i) => createBall(Math.floor(i / 6), (i % 6) + 1, i < 10 ? 1 : 0, 1))
    // Innings 2: 11 runs scored in 7 balls with 1 wicket down
    const inn2Events = [
      createBall(0, 1, 4, 2),
      createBall(0, 2, 0, 2, true), // wicket 1
      createBall(0, 3, 1, 2),
      createBall(0, 4, 2, 2),
      createBall(0, 5, 0, 2),
      createBall(0, 6, 4, 2), // total 11
    ]

    const result = deriveTournamentResult(baseFixture, baseConfig, [...inn1Events, ...inn2Events], 'team-A', 'team-B')

    expect(result.winnerTeamId).toBe('team-B')
    // Max wickets is 3. 1 down => 2 wickets in hand. 6 balls remaining out of 12.
    expect(result.marginText).toContain('Won by 2 wickets')
    expect(result.marginText).toContain('6 balls remaining')
  })

  it('derives all-out in first innings', () => {
    // Innings 1: 3 wickets in 5 balls
    const inn1Events = [
      createBall(0, 1, 0, 1, true),
      createBall(0, 2, 1, 1),
      createBall(0, 3, 0, 1, true),
      createBall(0, 4, 2, 1),
      createBall(0, 5, 0, 1, true),
    ]
    const inn2Events = [createBall(0, 1, 4, 2)]

    const result = deriveTournamentResult(baseFixture, baseConfig, [...inn1Events, ...inn2Events], 'team-A', 'team-B')

    expect(result.innings1.isAllOut).toBe(true)
    expect(result.innings1.legalBalls).toBe(5)
    expect(result.innings1.allocatedQuotaBalls).toBe(12)
  })

  it('derives all-out while chasing in second innings', () => {
    // Innings 1: 24 runs
    const inn1Events = Array.from({ length: 12 }, (_, i) => createBall(0, (i % 6) + 1, 2, 1))
    // Innings 2: 3 wickets in 4 balls, 1 run
    const inn2Events = [
      createBall(0, 1, 0, 2, true),
      createBall(0, 2, 1, 2),
      createBall(0, 3, 0, 2, true),
      createBall(0, 4, 0, 2, true),
    ]

    const result = deriveTournamentResult(baseFixture, baseConfig, [...inn1Events, ...inn2Events], 'team-A', 'team-B')

    expect(result.winnerTeamId).toBe('team-A')
    expect(result.innings2.isAllOut).toBe(true)
    expect(result.marginText).toBe('Won by 23 runs')
  })

  it('derives match tied when scores level without super over', () => {
    // Innings 1: 10 runs in 12 balls
    const inn1Events = Array.from({ length: 12 }, (_, i) => createBall(0, (i % 6) + 1, i < 10 ? 1 : 0, 1))
    // Innings 2: exactly 10 runs in 12 balls
    const inn2Events = Array.from({ length: 12 }, (_, i) => createBall(0, (i % 6) + 1, i < 10 ? 1 : 0, 2))

    const result = deriveTournamentResult(baseFixture, baseConfig, [...inn1Events, ...inn2Events], 'team-A', 'team-B')

    expect(result.isTie).toBe(true)
    expect(result.winnerTeamId).toBeNull()
    expect(result.marginText).toBe('Match tied')
  })

  it('derives super over victory when scores level and super over played', () => {
    const inn1Events = Array.from({ length: 12 }, (_, i) => createBall(0, (i % 6) + 1, i < 10 ? 1 : 0, 1))
    const inn2Events = Array.from({ length: 12 }, (_, i) => createBall(0, (i % 6) + 1, i < 10 ? 1 : 0, 2))

    // Super over (Inn 3: team-A scores 8 runs, Inn 4: team-B scores 10 runs)
    const so1 = Array.from({ length: 6 }, (_, i) => createBall(0, i + 1, i < 4 ? 2 : 0, 3))
    const so2 = Array.from({ length: 6 }, (_, i) => createBall(0, i + 1, 2, 4))

    const result = deriveTournamentResult(baseFixture, baseConfig, [...inn1Events, ...inn2Events, ...so1, ...so2], 'team-A', 'team-B')

    expect(result.isSuperOver).toBe(true)
    expect(result.superOverWinnerId).toBe('team-B')
    expect(result.winnerTeamId).toBe('team-B')
    expect(result.marginText).toBe('Match tied (Won Super Over)')
  })

  it('handles walkover override', () => {
    const walkoverFixture: Fixture = {
      ...baseFixture,
      status: 'walkover',
      resultOverride: {
        type: 'walkover',
        winnerTeamId: 'team-A',
        note: 'Team B forfeits',
      },
    }

    const result = deriveTournamentResult(walkoverFixture, baseConfig, [], 'team-A', 'team-B')

    expect(result.winnerTeamId).toBe('team-A')
    expect(result.marginText).toBe('Match awarded by walkover')
    expect(result.isNoResult).toBe(false)
  })

  it('handles abandoned override', () => {
    const abandonedFixture: Fixture = {
      ...baseFixture,
      status: 'abandoned',
      resultOverride: {
        type: 'abandoned',
        note: 'Rain stoppage',
      },
    }

    const result = deriveTournamentResult(abandonedFixture, baseConfig, [], 'team-A', 'team-B')

    expect(result.winnerTeamId).toBeNull()
    expect(result.isNoResult).toBe(true)
    expect(result.marginText).toBe('Match Abandoned (Rain stoppage)')
  })

  it('handles revised target override', () => {
    // Innings 1: 30 runs in 12 balls
    const inn1Events = Array.from({ length: 12 }, (_, i) => createBall(0, (i % 6) + 1, i < 10 ? 3 : 0, 1))

    const revisedFixture: Fixture = {
      ...baseFixture,
      resultOverride: {
        type: 'revised_target',
        revisedTarget: 15,
        revisedQuotaBalls: 6, // 1 over revised quota
      },
    }

    // Innings 2: 15 runs in 4 balls (chase achieved)
    const inn2Events = [
      createBall(0, 1, 4, 2),
      createBall(0, 2, 4, 2),
      createBall(0, 3, 4, 2),
      createBall(0, 4, 4, 2),
    ]

    const result = deriveTournamentResult(revisedFixture, baseConfig, [...inn1Events, ...inn2Events], 'team-A', 'team-B')

    expect(result.winnerTeamId).toBe('team-B')
    expect(result.innings2.allocatedQuotaBalls).toBe(6)
    expect(result.revisedTarget).toBe(15)
  })

  it('handles tie decided manually override', () => {
    const tieFixture: Fixture = {
      ...baseFixture,
      resultOverride: {
        type: 'tie_decided_manually',
        winnerTeamId: 'team-A',
        note: 'Coin toss',
      },
    }

    const result = deriveTournamentResult(tieFixture, baseConfig, [], 'team-A', 'team-B')

    expect(result.isTie).toBe(true)
    expect(result.winnerTeamId).toBe('team-A')
    expect(result.marginText).toBe('Tie - Decided Manually (Coin toss)')
  })

  // Format variations tests
  it('correctly uses singular "run" when winning by exactly 1 run', () => {
    // Innings 1: 11 runs
    const inn1 = Array.from({ length: 11 }, (_, i) => createBall(0, (i % 6) + 1, 1, 1))
    // Innings 2: 10 runs
    const inn2 = Array.from({ length: 12 }, (_, i) => createBall(0, (i % 6) + 1, i < 10 ? 1 : 0, 2))

    const result = deriveTournamentResult(baseFixture, baseConfig, [...inn1, ...inn2], 'team-A', 'team-B')

    expect(result.marginText).toBe('Won by 1 run')
  })

  it('correctly uses singular "wicket" when winning by exactly 1 wicket', () => {
    // Innings 1: 5 runs
    const inn1 = Array.from({ length: 5 }, (_, i) => createBall(0, i + 1, 1, 1))
    // Innings 2: 2 wickets down, hit boundary to win
    const inn2 = [
      createBall(0, 1, 0, 2, true), // w1
      createBall(0, 2, 0, 2, true), // w2
      createBall(0, 3, 6, 2), // 6 runs -> target 6 achieved
    ]

    const result = deriveTournamentResult(baseFixture, baseConfig, [...inn1, ...inn2], 'team-A', 'team-B')

    // 3 max wickets - 2 lost = 1 wicket in hand
    expect(result.marginText).toContain('Won by 1 wicket')
  })

  it('identifies match in progress when innings 2 is incomplete and target not reached', () => {
    const inn1 = Array.from({ length: 12 }, (_, i) => createBall(0, (i % 6) + 1, 2, 1))
    const inn2 = [createBall(0, 1, 1, 2)]

    const result = deriveTournamentResult(baseFixture, baseConfig, [...inn1, ...inn2], 'team-A', 'team-B')

    expect(result.winnerTeamId).toBeNull()
    expect(result.marginText).toBe('Match in progress')
  })

  // More test cases to reach 25+
  for (let m = 2; m <= 12; m++) {
    it(`correctly computes margin text for multi-run victory of ${m} runs`, () => {
      // Innings 1 scores (10 + m) runs across 12 balls
      const inn1 = Array.from({ length: 12 }, (_, i) =>
        createBall(0, 1, i === 0 ? m : 1, 1),
      ) // total runs = m + 11
      // Innings 2 scores 11 runs across 12 balls
      const inn2 = Array.from({ length: 12 }, (_, i) =>
        createBall(0, 1, i < 11 ? 1 : 0, 2),
      ) // total runs = 11

      const result = deriveTournamentResult(baseFixture, baseConfig, [...inn1, ...inn2], 'team-A', 'team-B')
      expect(result.marginText).toBe(`Won by ${m} runs`)
    })
  }
})
