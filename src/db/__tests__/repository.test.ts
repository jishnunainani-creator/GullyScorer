import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { PitchLogDatabase } from '../db'
import { MatchRepository } from '../repository'
import type { BallEvent, MatchConfig } from '../../engine/types'
import type { MatchRecord, TeamRecord, PlayerRecord } from '../schema'

describe('MatchRepository with IndexedDB', () => {
  let db: PitchLogDatabase
  let repo: MatchRepository

  const mockConfig: MatchConfig = {
    oversPerInnings: 5,
    playersPerSide: 4,
    wideReBowl: true,
    noBallFreeHit: true,
    lastManStands: false,
  }

  const mockMatch: MatchRecord = {
    id: 'test-match-1',
    date: new Date().toISOString(),
    config: mockConfig,
    teamAId: 'team-a',
    teamBId: 'team-b',
    tossWinnerId: 'team-a',
    tossDecision: 'bat',
    currentInningsNo: 1,
    innings1BattingTeamId: 'team-a',
    innings1BowlingTeamId: 'team-b',
    innings2BattingTeamId: 'team-b',
    innings2BowlingTeamId: 'team-a',
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
    { id: 'team-a', name: 'Warriors', playerIds: ['p1', 'p2', 'p3', 'p4'] },
    { id: 'team-b', name: 'Strikers', playerIds: ['p5', 'p6', 'p7', 'p8'] },
  ]

  const mockPlayers: PlayerRecord[] = [
    { id: 'p1', name: 'Rohit', teamId: 'team-a' },
    { id: 'p2', name: 'Virat', teamId: 'team-a' },
    { id: 'p3', name: 'Surya', teamId: 'team-a' },
    { id: 'p4', name: 'Hardik', teamId: 'team-a' },
    { id: 'p5', name: 'Bumrah', teamId: 'team-b' },
    { id: 'p6', name: 'Shami', teamId: 'team-b' },
    { id: 'p7', name: 'Kuldeep', teamId: 'team-b' },
    { id: 'p8', name: 'Siraj', teamId: 'team-b' },
  ]

  beforeEach(() => {
    db = new PitchLogDatabase(`test-db-${Date.now()}-${Math.random()}`)
    repo = new MatchRepository(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('creates and retrieves a match with teams and players', async () => {
    await repo.createMatch(mockMatch, mockTeams, mockPlayers)

    const retrieved = await repo.getMatch('test-match-1')
    expect(retrieved).toBeDefined()
    expect(retrieved?.id).toBe('test-match-1')
    expect(retrieved?.config.oversPerInnings).toBe(5)

    const teams = await repo.getTeams(['team-a', 'team-b'])
    expect(teams).toHaveLength(2)

    const players = await repo.getPlayers(['p1', 'p2', 'p5'])
    expect(players).toHaveLength(3)
  })

  it('writes ball events immediately and retrieves them in sequence', async () => {
    await repo.createMatch(mockMatch, mockTeams, mockPlayers)

    const ball1: BallEvent = {
      id: 'ball-1',
      inningsNo: 1,
      batterId: 'p1',
      nonStrikerId: 'p2',
      bowlerId: 'p5',
      runsOffBat: 1,
      extra: null,
      wicket: null,
      isBoundary4: false,
      isBoundary6: false,
      timestamp: Date.now(),
    }

    const ball2: BallEvent = {
      id: 'ball-2',
      inningsNo: 1,
      batterId: 'p2',
      nonStrikerId: 'p1',
      bowlerId: 'p5',
      runsOffBat: 4,
      extra: null,
      wicket: null,
      isBoundary4: true,
      isBoundary6: false,
      timestamp: Date.now() + 1000,
    }

    await repo.addBallEvent('test-match-1', ball1)
    await repo.addBallEvent('test-match-1', ball2)

    const loadedBalls = await repo.getBallEvents('test-match-1')
    expect(loadedBalls).toHaveLength(2)
    expect(loadedBalls[0]?.id).toBe('ball-1')
    expect(loadedBalls[1]?.id).toBe('ball-2')
    expect(loadedBalls[1]?.runsOffBat).toBe(4)
  })

  it('undo persistently removes the last ball of the specified innings', async () => {
    await repo.createMatch(mockMatch, mockTeams, mockPlayers)

    const ball1: BallEvent = {
      id: 'b-inn1-1',
      inningsNo: 1,
      batterId: 'p1',
      nonStrikerId: 'p2',
      bowlerId: 'p5',
      runsOffBat: 1,
      extra: null,
      wicket: null,
      isBoundary4: false,
      isBoundary6: false,
      timestamp: Date.now(),
    }
    const ball2: BallEvent = {
      id: 'b-inn1-2',
      inningsNo: 1,
      batterId: 'p2',
      nonStrikerId: 'p1',
      bowlerId: 'p5',
      runsOffBat: 6,
      extra: null,
      wicket: null,
      isBoundary4: false,
      isBoundary6: true,
      timestamp: Date.now() + 1000,
    }
    const ball3: BallEvent = {
      id: 'b-inn2-1',
      inningsNo: 2,
      batterId: 'p5',
      nonStrikerId: 'p6',
      bowlerId: 'p1',
      runsOffBat: 2,
      extra: null,
      wicket: null,
      isBoundary4: false,
      isBoundary6: false,
      timestamp: Date.now() + 2000,
    }

    await repo.addBallEvent('test-match-1', ball1)
    await repo.addBallEvent('test-match-1', ball2)
    await repo.addBallEvent('test-match-1', ball3)

    // Undo innings 1: must remove b-inn1-2, leaving b-inn1-1 and b-inn2-1
    const removed = await repo.removeLastBallEvent('test-match-1', 1)
    expect(removed?.id).toBe('b-inn1-2')

    const remaining = await repo.getBallEvents('test-match-1')
    expect(remaining.map((b) => b.id)).toEqual(['b-inn1-1', 'b-inn2-1'])
  })

  it('reloading repo instance restores exact state from database', async () => {
    await repo.createMatch(mockMatch, mockTeams, mockPlayers)

    const ball1: BallEvent = {
      id: 'persist-ball-1',
      inningsNo: 1,
      batterId: 'p1',
      nonStrikerId: 'p2',
      bowlerId: 'p5',
      runsOffBat: 3,
      extra: null,
      wicket: null,
      isBoundary4: false,
      isBoundary6: false,
      timestamp: Date.now(),
    }
    await repo.addBallEvent('test-match-1', ball1)

    // Simulate page reload by creating a new repository with the same db
    const freshRepo = new MatchRepository(db)
    const freshMatch = await freshRepo.getMatch('test-match-1')
    const freshBalls = await freshRepo.getBallEvents('test-match-1')

    expect(freshMatch?.id).toBe('test-match-1')
    expect(freshBalls).toHaveLength(1)
    expect(freshBalls[0]?.runsOffBat).toBe(3)
  })
})
