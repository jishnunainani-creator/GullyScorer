import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { PitchLogDatabase } from '../../db/db'
import { MatchRepository } from '../../db/repository'
import type { BallEvent, MatchConfig } from '../../engine/types'
import type { MatchRecord, TeamRecord, PlayerRecord } from '../../db/schema'

describe('Player Identity & Merge Operation', () => {
  let db: PitchLogDatabase
  let repo: MatchRepository

  const mockConfig: MatchConfig = {
    oversPerInnings: 2,
    playersPerSide: 4,
    wideReBowl: true,
    noBallFreeHit: true,
    lastManStands: false,
  }

  beforeEach(async () => {
    db = new PitchLogDatabase(`test-db-merge-${Math.random()}`)
    repo = new MatchRepository(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('remaps IDs across events, updates team rosters, soft-deletes source player, and enqueues outbox items', async () => {
    // Setup 2 players representing the same person created with two different IDs
    const playerA: PlayerRecord = { id: 'p-id-1', name: 'Rahul' }
    const playerB: PlayerRecord = { id: 'p-id-2', name: 'Rahul' }
    const bowler: PlayerRecord = { id: 'p-bowler', name: 'Bowler' }

    const team: TeamRecord = {
      id: 'team-1',
      name: 'XI',
      playerIds: ['p-id-1', 'p-id-2', 'p-bowler'],
    }

    const match: MatchRecord = {
      id: 'm-1',
      date: new Date().toISOString(),
      config: mockConfig,
      teamAId: 'team-1',
      teamBId: 'team-1',
      tossWinnerId: 'team-1',
      tossDecision: 'bat',
      currentInningsNo: 1,
      innings1BattingTeamId: 'team-1',
      innings1BowlingTeamId: 'team-1',
      innings2BattingTeamId: 'team-1',
      innings2BowlingTeamId: 'team-1',
      innings1Openers: {
        strikerId: 'p-id-1',
        nonStrikerId: 'p-id-2',
        bowlerId: 'p-bowler',
      },
      status: 'completed',
      createdAt: 1000,
      updatedAt: 2000,
    }

    await repo.createMatch(match, [team], [playerA, playerB, bowler])

    // Ball 1: p-id-1 scores 4
    const ball1: BallEvent = {
      id: 'ball-1',
      inningsNo: 1,
      batterId: 'p-id-1',
      nonStrikerId: 'p-id-2',
      bowlerId: 'p-bowler',
      runsOffBat: 4,
      extra: null,
      wicket: null,
      isBoundary4: true,
      isBoundary6: false,
      timestamp: 1000,
    }

    // Ball 2: p-id-2 scores 6
    const ball2: BallEvent = {
      id: 'ball-2',
      inningsNo: 1,
      batterId: 'p-id-2',
      nonStrikerId: 'p-id-1',
      bowlerId: 'p-bowler',
      runsOffBat: 6,
      extra: null,
      wicket: null,
      isBoundary4: false,
      isBoundary6: true,
      timestamp: 2000,
    }

    await repo.addBallEvent(match.id, ball1)
    await repo.addBallEvent(match.id, ball2)

    // Clear outbox from setup
    const initialOutbox = await repo.getPendingOutbox(100)
    await repo.removeOutboxItems(initialOutbox.map((i) => i.id))

    // MERGE player p-id-2 INTO p-id-1
    const result = await repo.mergePlayers('p-id-2', 'p-id-1')

    expect(result.affectedBalls).toBeGreaterThanOrEqual(1)
    expect(result.affectedTeams).toBe(1)

    // Verify all ball events now belong to p-id-1
    const updatedBalls = await repo.getBallEvents(match.id)
    for (const b of updatedBalls) {
      expect(b.batterId).not.toBe('p-id-2')
      expect(b.nonStrikerId).not.toBe('p-id-2')
    }

    // Verify team roster no longer contains p-id-2, but contains p-id-1
    const updatedTeam = (await repo.getTeams(['team-1']))[0]!
    expect(updatedTeam.playerIds).toContain('p-id-1')
    expect(updatedTeam.playerIds).not.toContain('p-id-2')

    // Verify source player p-id-2 is marked deletedAt
    const players = await repo.getPlayers(['p-id-2'])
    expect(players[0]?.deletedAt).toBeDefined()

    // Verify career totals are combined for p-id-1 (4 + 6 = 10 runs)
    const b1Runs = updatedBalls.filter((b) => b.batterId === 'p-id-1')
    const totalRuns = b1Runs.reduce((acc, curr) => acc + curr.runsOffBat, 0)
    expect(totalRuns).toBe(10)

    // Verify outbox entries were queued for syncing the merge to remote Supabase
    const syncOutbox = await repo.getPendingOutbox(100)
    expect(syncOutbox.length).toBeGreaterThan(0)
    const types = syncOutbox.map((o) => o.type)
    expect(types).toContain('insert_ball')
    expect(types).toContain('upsert_team')
    expect(types).toContain('upsert_player')
  })
})
