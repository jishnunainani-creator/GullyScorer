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

  it('updates player profile with styles, phone, and outbox sync record', async () => {
    await repo.createMatch(mockMatch, mockTeams, mockPlayers)

    await repo.updatePlayerProfile('p1', {
      name: 'Rohit Sharma (Captain)',
      battingStyle: 'RIGHT_HAND',
      bowlingStyle: 'RIGHT_ARM_SPIN',
      jerseyNumber: 45,
    })

    const updated = (await repo.getPlayers(['p1']))[0]
    expect(updated?.name).toBe('Rohit Sharma (Captain)')
    expect(updated?.battingStyle).toBe('RIGHT_HAND')
    expect(updated?.bowlingStyle).toBe('RIGHT_ARM_SPIN')
    expect(updated?.jerseyNumber).toBe(45)

    const outbox = await repo.getPendingOutbox()
    const playerOutbox = outbox.find(
      (o) => o.type === 'update_player_profile' && o.entityId === 'p1',
    )
    expect(playerOutbox).toBeDefined()
  })

  it('updates team identity with avatar and captain assignment', async () => {
    await repo.createMatch(mockMatch, mockTeams, mockPlayers)

    await repo.setTeamCaptain('team-a', 'p1')
    await repo.setTeamViceCaptain('team-a', 'p2')
    await repo.updateTeamIdentity('team-a', {
      avatar: {
        category: 'IPL',
        assetKey: 'mumbai',
        primaryColor: '#004ba0',
        secondaryColor: '#d4af37',
      },
    })

    const team = (await repo.getTeams(['team-a']))[0]
    expect(team?.captainPlayerId).toBe('p1')
    expect(team?.viceCaptainPlayerId).toBe('p2')
    expect(team?.avatar?.assetKey).toBe('mumbai')
  })

  it('saves and retrieves configurable match rules', async () => {
    await repo.createMatch(mockMatch, mockTeams, mockPlayers)

    const gullyRules: any = {
      id: 'rules-test-1',
      presetName: 'gully_cricket',
      presetDisplayName: 'Gully Cricket (Street Rules)',
      version: 1,
      oversPerInnings: 5,
      ballsPerOver: 6,
      playersPerSide: 6,
      wicketsAllOut: 5,
      lastManStands: true,
      oneTipOneHand: {
        enabled: true,
        maxBounces: 1,
        maxHandsAllowed: 1,
        canTouchWallBeforeCatch: false,
        bowlerCredited: true,
        dismissalLabel: 'One Tip One Hand',
      },
      mankad: { enabled: true, bowlerCredited: false, allowWarningFirst: true },
      hitWicket: { enabled: true, bowlerCredited: true, freeHitExemption: true },
      wallRules: {
        enabled: true,
        directHitOutcome: 'four_runs',
        tapOutcome: 'one_run',
        carOrWindowDirectHitOut: true,
        canCatchOffWall: false,
      },
      paceCall: { enabled: false, status: 'PENDING_SPECIFICATION' },
      deadBall: {
        allowManualDeclaration: true,
        defaultRepeatDelivery: true,
        awardPenaltyRuns: false,
        penaltyRunsAmount: 0,
      },
      lbwEnabled: false,
      wideReBowl: true,
      wideRunsAwarded: 1,
      noBallReBowl: true,
      noBallRunsAwarded: 1,
      noBallFreeHit: false,
      byesEnabled: true,
      legByesEnabled: false,
      overthrowsEnabled: true,
    }

    await repo.saveMatchRules(gullyRules, 'test-match-1')

    const loadedRules = await repo.getMatchRules('test-match-1')
    expect(loadedRules?.presetName).toBe('gully_cricket')
    expect(loadedRules?.oneTipOneHand.enabled).toBe(true)
    expect(loadedRules?.wallRules.directHitOutcome).toBe('four_runs')

    const match = await repo.getMatch('test-match-1')
    expect(match?.rulesPreset).toBe('gully_cricket')
  })
})
