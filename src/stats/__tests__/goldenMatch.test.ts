import { describe, it, expect } from 'vitest'
import type { BallEvent, MatchConfig } from '../../engine/types'
import { deriveInningsBatting } from '../batting'
import { deriveInningsBowling } from '../bowling'
import { deriveMatchAnalysis } from '../matchStats'
import type { MatchRecord } from '../../db/schema'

// Hand-verified 2-over Golden Match Fixture
// In this match:
// Innings 1:
// Over 1 (Bowler B1):
// Ball 1: p-b1 faces B1, hits 4 (boundary). (Score: 4/0, p-b1: 4 off 1)
// Ball 2: p-b1 faces B1, hits 1 (single, swap). (Score: 5/0, p-b1: 5 off 2, p-b2: 0 off 0)
// Ball 3: p-b2 faces B1, hits 6 (boundary 6). (Score: 11/0, p-b2: 6 off 1)
// Ball 4: p-b2 faces B1, 0 off bat + 1 bye (swap). (Score: 12/0, p-b2: 6 off 2)
// Ball 5: p-b1 faces B1, dot ball. (Score: 12/0, p-b1: 5 off 3)
// Ball 6: p-b1 faces B1, bowled! (Score: 12/1, p-b1 out for 5 off 4 balls)
// Over 2 (Bowler B2):
// Ball 1: p-b2 faces B2, wide (+1 extra). (Score: 13/1)
// Ball 2: p-b2 faces B2, hits 4 (boundary 4). (Score: 17/1, p-b2: 10 off 3)
// Ball 3: p-b2 faces B2, hits 1 (single, swap). (Score: 18/1, p-b2: 11 off 4)
// Ball 4: p-b3 (incoming) faces B2, hits 6 (boundary 6). (Score: 24/1, p-b3: 6 off 1)
// Ball 5: p-b3 faces B2, hits 2. (Score: 26/1, p-b3: 8 off 2)
// Ball 6: p-b3 faces B2, hits 4. (Score: 30/1, p-b3: 12 off 3)
// Total Score: 30 runs for 1 wicket in 2.0 overs (12 legal deliveries + 1 wide)

const goldenEvents: BallEvent[] = [
  // Over 1 (B1)
  {
    id: 'g-1',
    inningsNo: 1,
    batterId: 'p-b1',
    nonStrikerId: 'p-b2',
    bowlerId: 'p-B1',
    runsOffBat: 4,
    extra: null,
    wicket: null,
    isBoundary4: true,
    isBoundary6: false,
    timestamp: 1000,
  },
  {
    id: 'g-2',
    inningsNo: 1,
    batterId: 'p-b1',
    nonStrikerId: 'p-b2',
    bowlerId: 'p-B1',
    runsOffBat: 1,
    extra: null,
    wicket: null,
    isBoundary4: false,
    isBoundary6: false,
    timestamp: 2000,
  },
  {
    id: 'g-3',
    inningsNo: 1,
    batterId: 'p-b2',
    nonStrikerId: 'p-b1',
    bowlerId: 'p-B1',
    runsOffBat: 6,
    extra: null,
    wicket: null,
    isBoundary4: false,
    isBoundary6: true,
    timestamp: 3000,
  },
  {
    id: 'g-4',
    inningsNo: 1,
    batterId: 'p-b2',
    nonStrikerId: 'p-b1',
    bowlerId: 'p-B1',
    runsOffBat: 0,
    extra: { type: 'bye', runs: 1 },
    wicket: null,
    isBoundary4: false,
    isBoundary6: false,
    timestamp: 4000,
  },
  {
    id: 'g-5',
    inningsNo: 1,
    batterId: 'p-b1',
    nonStrikerId: 'p-b2',
    bowlerId: 'p-B1',
    runsOffBat: 0,
    extra: null,
    wicket: null,
    isBoundary4: false,
    isBoundary6: false,
    timestamp: 5000,
  },
  {
    id: 'g-6',
    inningsNo: 1,
    batterId: 'p-b1',
    nonStrikerId: 'p-b2',
    bowlerId: 'p-B1',
    runsOffBat: 0,
    extra: null,
    wicket: { type: 'bowled', playerOutId: 'p-b1' },
    isBoundary4: false,
    isBoundary6: false,
    timestamp: 6000,
  },

  // Over 2 (B2)
  {
    id: 'g-7',
    inningsNo: 1,
    batterId: 'p-b2',
    nonStrikerId: 'p-b3',
    bowlerId: 'p-B2',
    runsOffBat: 0,
    extra: { type: 'wide', runs: 1 },
    wicket: null,
    isBoundary4: false,
    isBoundary6: false,
    timestamp: 7000,
  },
  {
    id: 'g-8',
    inningsNo: 1,
    batterId: 'p-b2',
    nonStrikerId: 'p-b3',
    bowlerId: 'p-B2',
    runsOffBat: 4,
    extra: null,
    wicket: null,
    isBoundary4: true,
    isBoundary6: false,
    timestamp: 8000,
  },
  {
    id: 'g-9',
    inningsNo: 1,
    batterId: 'p-b2',
    nonStrikerId: 'p-b3',
    bowlerId: 'p-B2',
    runsOffBat: 1,
    extra: null,
    wicket: null,
    isBoundary4: false,
    isBoundary6: false,
    timestamp: 9000,
  },
  {
    id: 'g-10',
    inningsNo: 1,
    batterId: 'p-b3',
    nonStrikerId: 'p-b2',
    bowlerId: 'p-B2',
    runsOffBat: 6,
    extra: null,
    wicket: null,
    isBoundary4: false,
    isBoundary6: true,
    timestamp: 10000,
  },
  {
    id: 'g-11',
    inningsNo: 1,
    batterId: 'p-b3',
    nonStrikerId: 'p-b2',
    bowlerId: 'p-B2',
    runsOffBat: 2,
    extra: null,
    wicket: null,
    isBoundary4: false,
    isBoundary6: false,
    timestamp: 11000,
  },
  {
    id: 'g-12',
    inningsNo: 1,
    batterId: 'p-b3',
    nonStrikerId: 'p-b2',
    bowlerId: 'p-B2',
    runsOffBat: 4,
    extra: null,
    wicket: null,
    isBoundary4: true,
    isBoundary6: false,
    timestamp: 12000,
  },
  {
    id: 'g-13',
    inningsNo: 1,
    batterId: 'p-b3',
    nonStrikerId: 'p-b2',
    bowlerId: 'p-B2',
    runsOffBat: 1,
    extra: null,
    wicket: null,
    isBoundary4: false,
    isBoundary6: false,
    timestamp: 13000,
  },
]

const goldenConfig: MatchConfig = {
  oversPerInnings: 2,
  playersPerSide: 11,
  wideReBowl: true,
  noBallFreeHit: true,
  lastManStands: false,
}

const goldenMatch: MatchRecord = {
  id: 'golden-match-1',
  date: '2026-11-06T00:00:00Z',
  config: goldenConfig,
  teamAId: 'team-A',
  teamBId: 'team-B',
  tossWinnerId: 'team-A',
  tossDecision: 'bat',
  currentInningsNo: 1,
  innings1BattingTeamId: 'team-A',
  innings1BowlingTeamId: 'team-B',
  innings2BattingTeamId: 'team-B',
  innings2BowlingTeamId: 'team-A',
  innings1Openers: {
    strikerId: 'p-b1',
    nonStrikerId: 'p-b2',
    bowlerId: 'p-B1',
  },
  status: 'completed',
  createdAt: 1000,
  updatedAt: 12000,
}

describe('Golden-File Verified Match Test', () => {
  it('asserts exact verified batting scorecard numbers', () => {
    const batting = deriveInningsBatting(goldenEvents, 'golden-match-1', 1)

    // Batter 1: 5 runs off 4 balls (one 4, one single, one dot, bowled on 4th ball)
    expect(batting['p-b1']?.runs).toBe(5)
    expect(batting['p-b1']?.ballsFaced).toBe(4)
    expect(batting['p-b1']?.fours).toBe(1)
    expect(batting['p-b1']?.sixes).toBe(0)
    expect(batting['p-b1']?.strikeRate).toBe(125.0)
    expect(batting['p-b1']?.isOut).toBe(true)
    expect(batting['p-b1']?.dismissalType).toBe('bowled')

    // Batter 2: 11 runs off 4 balls (one 6, one bye faced [not counted as bat runs], one 4, one 1)
    // Note: Wide does not count as ball faced!
    expect(batting['p-b2']?.runs).toBe(11)
    expect(batting['p-b2']?.ballsFaced).toBe(4)
    expect(batting['p-b2']?.fours).toBe(1)
    expect(batting['p-b2']?.sixes).toBe(1)
    expect(batting['p-b2']?.strikeRate).toBe(275.0)
    expect(batting['p-b2']?.isOut).toBe(false)

    // Batter 3: 13 runs off 4 balls (one 6, one 2, one 4, one 1)
    expect(batting['p-b3']?.runs).toBe(13)
    expect(batting['p-b3']?.ballsFaced).toBe(4)
    expect(batting['p-b3']?.fours).toBe(1)
    expect(batting['p-b3']?.sixes).toBe(1)
    expect(batting['p-b3']?.strikeRate).toBe(325.0)
    expect(batting['p-b3']?.isOut).toBe(false)
  })

  it('asserts exact verified bowling scorecard numbers', () => {
    const bowling = deriveInningsBowling(goldenEvents, 'golden-match-1', 1, goldenConfig)

    // Bowler 1: 1.0 over (6 balls), conceded 11 off the bat (4 + 1 + 6 = 11 runs, bye not charged), 1 wicket
    expect(bowling['p-B1']?.ballsBowled).toBe(6)
    expect(bowling['p-B1']?.overs).toBe('1.0')
    expect(bowling['p-B1']?.runsConceded).toBe(11)
    expect(bowling['p-B1']?.wickets).toBe(1)
    expect(bowling['p-B1']?.economy).toBe(11.0)
    expect(bowling['p-B1']?.maidens).toBe(0)

    // Bowler 2: 1.0 over (6 balls + 1 wide = 7 total deliveries), conceded 1 wide + (4 + 1 + 6 + 2 + 4 + 1) = 19 runs, 0 wickets
    expect(bowling['p-B2']?.ballsBowled).toBe(6)
    expect(bowling['p-B2']?.overs).toBe('1.0')
    expect(bowling['p-B2']?.runsConceded).toBe(19)
    expect(bowling['p-B2']?.wickets).toBe(0)
    expect(bowling['p-B2']?.economy).toBe(19.0)
    expect(bowling['p-B2']?.widesConceded).toBe(1)
  })

  it('asserts exact team totals and match analysis', () => {
    const analysis = deriveMatchAnalysis(goldenEvents, goldenMatch, [
      'p-b1',
      'p-b2',
      'p-b3',
      'p-B1',
      'p-B2',
    ])

    // Over 1 runs: 12 (4 + 1 + 6 + 1 bye = 12)
    // Over 2 runs: 19 (1 wide + 4 + 1 + 6 + 2 + 4 + 1 = 19)
    expect(analysis.runsPerOver[1]).toEqual([12, 19])
    expect(analysis.cumulativeRunsPerOver[1]).toEqual([12, 31])
    expect(analysis.wicketsPerOver[1]).toEqual([1, 0])

    // Fall of 1st wicket: score 12 at 1.0 overs
    expect(analysis.fallOfWickets[1]?.[0]?.score).toBe(12)
    expect(analysis.fallOfWickets[1]?.[0]?.wicketNo).toBe(1)
    expect(analysis.fallOfWickets[1]?.[0]?.playerOutId).toBe('p-b1')

    // Player of the Match
    expect(analysis.playerOfTheMatch).not.toBeNull()
  })
})
