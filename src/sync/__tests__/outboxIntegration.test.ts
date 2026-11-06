import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { PitchLogDatabase } from '../../db/db'
import { MatchRepository } from '../../db/repository'
import { SyncWorker } from '../syncWorker'
import type { BallEvent, MatchConfig } from '../../engine/types'
import type { MatchRecord, TeamRecord, PlayerRecord } from '../../db/schema'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Outbox Integration (Score 10 balls offline, undo 2, sync to mock Supabase)', () => {
  let db: PitchLogDatabase
  let repo: MatchRepository
  let mockSupabase: Partial<SupabaseClient>
  let upsertedBallRows: any[] = []
  let tombstonedIds: string[] = []

  const mockConfig: MatchConfig = {
    oversPerInnings: 5,
    playersPerSide: 4,
    wideReBowl: true,
    noBallFreeHit: true,
    lastManStands: false,
  }

  const matchId = 'outbox-test-match'

  const mockMatch: MatchRecord = {
    id: matchId,
    date: new Date().toISOString(),
    config: mockConfig,
    teamAId: 'team-1',
    teamBId: 'team-2',
    tossWinnerId: 'team-1',
    tossDecision: 'bat',
    currentInningsNo: 1,
    innings1BattingTeamId: 'team-1',
    innings1BowlingTeamId: 'team-2',
    innings2BattingTeamId: 'team-2',
    innings2BowlingTeamId: 'team-1',
    innings1Openers: {
      strikerId: 'p1',
      nonStrikerId: 'p2',
      bowlerId: 'p3',
    },
    status: 'in_progress',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const mockTeams: TeamRecord[] = [
    { id: 'team-1', name: 'India', playerIds: ['p1', 'p2'] },
    { id: 'team-2', name: 'Australia', playerIds: ['p3', 'p4'] },
  ]

  const mockPlayers: PlayerRecord[] = [
    { id: 'p1', name: 'Rohit', teamId: 'team-1' },
    { id: 'p2', name: 'Kohli', teamId: 'team-1' },
    { id: 'p3', name: 'Starc', teamId: 'team-2' },
    { id: 'p4', name: 'Cummins', teamId: 'team-2' },
  ]

  beforeEach(async () => {
    db = new PitchLogDatabase(`outbox-integ-db-${Date.now()}-${Math.random()}`)
    repo = new MatchRepository(db)
    upsertedBallRows = []
    tombstonedIds = []

    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'test-user-uuid' } } },
        }),
      } as any,
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'ball_events') {
          return {
            upsert: vi.fn().mockImplementation((rows: unknown[]) => {
              upsertedBallRows.push(...rows)
              return Promise.resolve({ error: null })
            }),
            update: vi.fn().mockImplementation(() => ({
              eq: vi.fn().mockImplementation((col: string, val: string) => {
                if (col === 'id') tombstonedIds.push(val)
                return Promise.resolve({ error: null })
              }),
            })),
          }
        }
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
        }
      }) as any,
    }
  })

  afterEach(async () => {
    await db.delete()
  })

  it('enqueues outbox items offline, handles 2 undos with tombstones, and flushes cleanly on sync', async () => {
    // 1. Create match offline
    await repo.createMatch(mockMatch, mockTeams, mockPlayers)

    // 2. Score 10 balls offline
    for (let i = 1; i <= 10; i++) {
      const ball: BallEvent = {
        id: `ball-${i}`,
        inningsNo: 1,
        batterId: 'p1',
        nonStrikerId: 'p2',
        bowlerId: 'p3',
        runsOffBat: i === 4 ? 4 : i === 6 ? 6 : 1,
        extra: null,
        wicket: null,
        isBoundary4: i === 4,
        isBoundary6: i === 6,
        timestamp: Date.now() + i * 1000,
      }
      await repo.addBallEvent(matchId, ball)
    }

    // Verify 10 balls are in local DB
    const ballsBeforeUndo = await repo.getBallEvents(matchId)
    expect(ballsBeforeUndo).toHaveLength(10)

    // 3. Undo 2 balls (ball 10 and ball 9)
    const undo1 = await repo.removeLastBallEvent(matchId, 1)
    expect(undo1?.id).toBe('ball-10')

    const undo2 = await repo.removeLastBallEvent(matchId, 1)
    expect(undo2?.id).toBe('ball-9')

    // Verify local DB now only returns 8 active balls
    const ballsAfterUndo = await repo.getBallEvents(matchId)
    expect(ballsAfterUndo).toHaveLength(8)
    expect(ballsAfterUndo.map((b) => b.id)).toEqual([
      'ball-1', 'ball-2', 'ball-3', 'ball-4', 'ball-5', 'ball-6', 'ball-7', 'ball-8',
    ])

    // Verify outbox has recorded writes and tombstones
    const pendingOutbox = await repo.getPendingOutbox(100)
    expect(pendingOutbox.length).toBeGreaterThan(10)

    const tombstoneOps = pendingOutbox.filter((op) => op.type === 'tombstone_ball')
    expect(tombstoneOps).toHaveLength(2)
    expect(tombstoneOps.map((op) => op.entityId)).toContain('ball-10')
    expect(tombstoneOps.map((op) => op.entityId)).toContain('ball-9')

    // 4. Come online and run SyncWorker flush
    const worker = new SyncWorker(repo, mockSupabase as SupabaseClient)
    await worker.flushOutbox()

    // 5. Verify Supabase mock received upserts and tombstones
    expect(upsertedBallRows).toHaveLength(10) // All 10 balls were initially staged
    expect(tombstonedIds).toContain('ball-10')
    expect(tombstonedIds).toContain('ball-9')

    // 6. Verify outbox is now completely drained and clean
    const remainingOutbox = await repo.getPendingOutbox(100)
    expect(remainingOutbox).toHaveLength(0)
  })
})
