// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { PitchLogDatabase } from '../../db/db'
import { MatchRepository } from '../../db/repository'
import { useMatch } from '../useMatch'
import type { MatchConfig } from '../../engine/types'
import type { MatchRecord, TeamRecord, PlayerRecord } from '../../db/schema'

describe('useMatch Integration Hook Test', () => {
  let db: PitchLogDatabase
  let repo: MatchRepository

  const mockConfig: MatchConfig = {
    oversPerInnings: 2,
    playersPerSide: 4,
    wideReBowl: true,
    noBallFreeHit: true,
    lastManStands: false,
  }

  const matchId = 'integ-match-1'

  const mockMatch: MatchRecord = {
    id: matchId,
    date: new Date().toISOString(),
    config: mockConfig,
    teamAId: 'team-ind',
    teamBId: 'team-aus',
    tossWinnerId: 'team-ind',
    tossDecision: 'bat',
    currentInningsNo: 1,
    innings1BattingTeamId: 'team-ind',
    innings1BowlingTeamId: 'team-aus',
    innings2BattingTeamId: 'team-aus',
    innings2BowlingTeamId: 'team-ind',
    innings1Openers: {
      strikerId: 'p1',
      nonStrikerId: 'p2',
      bowlerId: 'p5',
    },
    status: 'in_progress',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const mockTeams: TeamRecord[] = [
    { id: 'team-ind', name: 'India', playerIds: ['p1', 'p2', 'p3', 'p4'] },
    { id: 'team-aus', name: 'Australia', playerIds: ['p5', 'p6', 'p7', 'p8'] },
  ]

  const mockPlayers: PlayerRecord[] = [
    { id: 'p1', name: 'Rohit', teamId: 'team-ind' },
    { id: 'p2', name: 'Gill', teamId: 'team-ind' },
    { id: 'p3', name: 'Kohli', teamId: 'team-ind' },
    { id: 'p4', name: 'Pant', teamId: 'team-ind' },
    { id: 'p5', name: 'Starc', teamId: 'team-aus' },
    { id: 'p6', name: 'Cummins', teamId: 'team-aus' },
    { id: 'p7', name: 'Hazlewood', teamId: 'team-aus' },
    { id: 'p8', name: 'Zampa', teamId: 'team-aus' },
  ]

  beforeEach(async () => {
    db = new PitchLogDatabase(`integ-db-${Date.now()}-${Math.random()}`)
    repo = new MatchRepository(db)
    await repo.createMatch(mockMatch, mockTeams, mockPlayers)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('scores a full 2-over innings, checks strike rotation, over transition, and completion', async () => {
    const { result } = renderHook(() => useMatch(matchId, repo))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.striker?.name).toBe('Rohit')
    expect(result.current.nonStriker?.name).toBe('Gill')
    expect(result.current.currentBowler?.name).toBe('Starc')

    // Over 1 (bowled by Starc):
    // Ball 1: 1 run (Rohit -> Gill)
    await act(async () => {
      await result.current.addBall({ runsOffBat: 1 })
    })
    expect(result.current.currentInnings?.totalRuns).toBe(1)
    expect(result.current.striker?.name).toBe('Gill')
    expect(result.current.nonStriker?.name).toBe('Rohit')

    // Ball 2: 4 runs boundary by Gill (Gill stays on strike)
    await act(async () => {
      await result.current.addBall({ runsOffBat: 4, isBoundary4: true })
    })
    expect(result.current.currentInnings?.totalRuns).toBe(5)
    expect(result.current.striker?.name).toBe('Gill')

    // Ball 3: 0 runs dot
    await act(async () => {
      await result.current.addBall({ runsOffBat: 0 })
    })

    // Ball 4: Wide 1 run (illegal ball, legal balls stays 3)
    await act(async () => {
      await result.current.addBall({
        runsOffBat: 0,
        extra: { type: 'wide', runs: 1 },
      })
    })
    expect(result.current.currentInnings?.totalRuns).toBe(6)
    expect(result.current.currentInnings?.legalBalls).toBe(3)

    // Ball 5: 2 runs
    await act(async () => {
      await result.current.addBall({ runsOffBat: 2 })
    })
    expect(result.current.currentInnings?.totalRuns).toBe(8)
    expect(result.current.currentInnings?.legalBalls).toBe(4)

    // Ball 6: 1 run (Gill -> Rohit)
    await act(async () => {
      await result.current.addBall({ runsOffBat: 1 })
    })
    expect(result.current.currentInnings?.totalRuns).toBe(9)
    expect(result.current.currentInnings?.legalBalls).toBe(5)
    expect(result.current.striker?.name).toBe('Rohit')

    // Ball 7 (6th legal ball): 6 runs by Rohit!
    // Boundary 6: no run swap. Over ends: ends swap -> Gill faces Over 2!
    await act(async () => {
      await result.current.addBall({ runsOffBat: 6, isBoundary6: true })
    })
    expect(result.current.currentInnings?.totalRuns).toBe(15)
    expect(result.current.currentInnings?.legalBalls).toBe(6)
    expect(result.current.currentInnings?.overs).toBe('1.0')
    expect(result.current.needsNewBowler).toBe(true)
    expect(result.current.striker?.name).toBe('Gill')
    expect(result.current.nonStriker?.name).toBe('Rohit')

    // Select new bowler for Over 2: Cummins (p6)
    act(() => {
      result.current.setNewBowler('p6')
    })
    expect(result.current.currentBowler?.name).toBe('Cummins')

    // Over 2 (bowled by Cummins):
    // Ball 1: Gill is out caught!
    await act(async () => {
      await result.current.addBall({
        runsOffBat: 0,
        wicket: { type: 'caught', playerOutId: 'p2' },
      })
    })
    expect(result.current.currentInnings?.wickets).toBe(1)
    expect(result.current.needsNewBatter).toBe(true)

    // Bring in new batter: Kohli (p3)
    act(() => {
      result.current.setNewBatter('p3')
    })
    expect(result.current.striker?.name).toBe('Kohli')

    // Ball 2: 1 run (Kohli -> Rohit)
    await act(async () => {
      await result.current.addBall({ runsOffBat: 1 })
    })
    expect(result.current.striker?.name).toBe('Rohit')

    // Ball 3: 2 runs
    await act(async () => {
      await result.current.addBall({ runsOffBat: 2 })
    })

    // Ball 4: 1 run (Rohit -> Kohli)
    await act(async () => {
      await result.current.addBall({ runsOffBat: 1 })
    })

    // Ball 5: 0 runs
    await act(async () => {
      await result.current.addBall({ runsOffBat: 0 })
    })

    // Ball 6 (last ball of 2 overs): 4 runs by Kohli!
    await act(async () => {
      await result.current.addBall({ runsOffBat: 4, isBoundary4: true })
    })

    // Total score calculation check:
    // Over 1: 1 + 4 + 0 + 1(wd) + 2 + 1 + 6 = 15 runs
    // Over 2: 0(W) + 1 + 2 + 1 + 0 + 4 = 8 runs
    // Total runs = 23 runs, 1 wicket, 2.0 overs
    expect(result.current.currentInnings?.totalRuns).toBe(23)
    expect(result.current.currentInnings?.wickets).toBe(1)
    expect(result.current.currentInnings?.overs).toBe('2.0')
    expect(result.current.currentInnings?.isComplete).toBe(true)
    expect(result.current.currentInnings?.endReason).toBe('overs_complete')

    // Test Undo persistence across over boundary:
    await act(async () => {
      await result.current.undo()
    })
    expect(result.current.currentInnings?.totalRuns).toBe(19)
    expect(result.current.currentInnings?.legalBalls).toBe(11)
    expect(result.current.currentInnings?.overs).toBe('1.5')
    expect(result.current.currentInnings?.isComplete).toBe(false)
  })
})
