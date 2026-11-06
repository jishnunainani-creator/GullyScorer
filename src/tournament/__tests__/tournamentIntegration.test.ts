import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { PitchLogDatabase } from '../../db/db'
import { MatchRepository } from '../../db/repository'
import { SyncWorker } from '../../sync/syncWorker'
import type { Tournament, TournamentTeam, Fixture } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Tournament Integration (Offline Dexie + Outbox Sync)', () => {
  let db: PitchLogDatabase
  let repo: MatchRepository
  let mockSupabase: Partial<SupabaseClient>
  let upsertedTournaments: any[] = []
  let upsertedTeams: any[] = []
  let upsertedFixtures: any[] = []

  const tournamentId = 'tourn-offline-101'
  const mockTournament: Tournament = {
    id: tournamentId,
    name: 'Gully Premier League 2026',
    format: 'league',
    oversPerInnings: 6,
    playersPerSide: 7,
    pointsRules: { win: 2, tie: 1, noResult: 1, loss: 0 },
    tiebreakOrder: ['points', 'wins', 'nrr', 'headToHead'],
    groupsCount: 1,
    qualifiersPerGroup: 0,
    knockoutStages: [],
    seedingMode: 'random',
    seedValue: 0,
    isPublic: true,
    shareToken: 'test-token-1234567890abcdef',
    status: 'in_progress',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const mockTeams: TournamentTeam[] = [
    { id: 'tt-1', tournamentId, teamId: 't-1', nameSnapshot: 'Mumbai Tigers', seed: 1 },
    { id: 'tt-2', tournamentId, teamId: 't-2', nameSnapshot: 'Delhi Dynamos', seed: 2 },
    { id: 'tt-3', tournamentId, teamId: 't-3', nameSnapshot: 'Bangalore Blasters', seed: 3 },
  ]

  const mockFixtures: Fixture[] = [
    {
      id: 'fix-1',
      tournamentId,
      round: 1,
      stage: 'group',
      homeTeamId: 'tt-1',
      awayTeamId: 'tt-2',
      status: 'scheduled',
      scheduledAt: Date.now() + 3600000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'fix-2',
      tournamentId,
      round: 2,
      stage: 'group',
      homeTeamId: 'tt-2',
      awayTeamId: 'tt-3',
      status: 'scheduled',
      scheduledAt: Date.now() + 7200000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'fix-3',
      tournamentId,
      round: 3,
      stage: 'group',
      homeTeamId: 'tt-3',
      awayTeamId: 'tt-1',
      status: 'scheduled',
      scheduledAt: Date.now() + 10800000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]

  beforeEach(async () => {
    db = new PitchLogDatabase(`tourn-integ-db-${Date.now()}-${Math.random()}`)
    repo = new MatchRepository(db)
    upsertedTournaments = []
    upsertedTeams = []
    upsertedFixtures = []

    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'test-organiser-uuid' } } },
        }),
      } as any,
      from: vi.fn().mockImplementation((table: string) => {
        return {
          upsert: vi.fn().mockImplementation((rows: unknown[]) => {
            const arr = Array.isArray(rows) ? rows : [rows]
            if (table === 'tournaments') upsertedTournaments.push(...arr)
            if (table === 'tournament_teams') upsertedTeams.push(...arr)
            if (table === 'fixtures') upsertedFixtures.push(...arr)
            return Promise.resolve({ error: null })
          }),
        }
      }) as any,
    }
  })

  afterEach(async () => {
    await db.delete()
  })

  it('saves tournament, teams, and fixtures locally and generates outbox queue records', async () => {
    // 1. Save Tournament
    await repo.saveTournament(mockTournament)
    const fetchedTourn = await repo.getTournament(tournamentId)
    expect(fetchedTourn).not.toBeNull()
    expect(fetchedTourn?.name).toBe('Gully Premier League 2026')

    // 2. Save Teams
    await repo.saveTournamentTeams(mockTeams)
    const fetchedTeams = await repo.getTournamentTeams(tournamentId)
    expect(fetchedTeams).toHaveLength(3)

    // 3. Save Fixtures
    await repo.saveFixtures(mockFixtures)
    const fetchedFixtures = await repo.getFixtures(tournamentId)
    expect(fetchedFixtures).toHaveLength(3)

    // Check Outbox
    const outboxItems = await db.outbox.toArray()
    expect(outboxItems.length).toBeGreaterThanOrEqual(7) // 1 tourn + 3 teams + 3 fixtures

    const tournOutbox = outboxItems.filter((i) => i.type === 'upsert_tournament')
    const teamOutbox = outboxItems.filter((i) => i.type === 'upsert_tournament_team')
    const fixOutbox = outboxItems.filter((i) => i.type === 'upsert_fixture')

    expect(tournOutbox).toHaveLength(1)
    expect(teamOutbox).toHaveLength(3)
    expect(fixOutbox).toHaveLength(3)

    // 4. Flush Outbox through SyncWorker
    const worker = new SyncWorker(repo, mockSupabase as SupabaseClient)
    await worker.flushOutbox()

    // Verify Supabase mock tables received mapped records
    expect(upsertedTournaments).toHaveLength(1)
    expect(upsertedTournaments[0].id).toBe(tournamentId)
    expect(upsertedTournaments[0].owner_id).toBe('test-organiser-uuid')
    expect(upsertedTournaments[0].name).toBe('Gully Premier League 2026')

    expect(upsertedTeams).toHaveLength(3)
    expect(upsertedTeams.map((t) => t.id).sort()).toEqual(['tt-1', 'tt-2', 'tt-3'])

    expect(upsertedFixtures).toHaveLength(3)
    expect(upsertedFixtures.map((f) => f.id).sort()).toEqual(['fix-1', 'fix-2', 'fix-3'])

    // Verify Outbox is empty now
    const remainingOutbox = await db.outbox.toArray()
    expect(remainingOutbox).toHaveLength(0)
  })

  it('updates fixture and attaches match id, propagating changes to outbox', async () => {
    await repo.saveTournament(mockTournament)
    await repo.saveFixtures(mockFixtures)

    const matchId = 'match-xyz-789'
    await repo.attachMatchToFixture('fix-1', matchId, tournamentId)

    const updated = await repo.getFixtures(tournamentId)
    const fix1 = updated.find((f) => f.id === 'fix-1')
    expect(fix1?.matchId).toBe(matchId)
    expect(fix1?.status).toBe('completed')

    const outboxItems = await db.outbox.where('type').equals('upsert_fixture').toArray()
    const fix1Outbox = outboxItems.filter((item) => item.payload.id === 'fix-1')
    expect(fix1Outbox.length).toBeGreaterThanOrEqual(1)
    const lastOutbox = fix1Outbox[fix1Outbox.length - 1]
    expect(lastOutbox?.payload.matchId).toBe(matchId)
    expect(lastOutbox?.payload.status).toBe('completed')
  })
})
