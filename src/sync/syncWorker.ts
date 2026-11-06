import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase as defaultSupabase, isSupabaseConfigured } from '../lib/supabase'
import { repository as defaultRepo, MatchRepository } from '../db/repository'
import { batchOutboxItems, resolveConflict } from './pure'
import type { TeamRecord, PlayerRecord, MatchRecord, Tournament, TournamentTeam, Fixture } from '../db/schema'
import type { BallEvent } from '../engine/types'

export interface SyncStats {
  pendingCount: number
  failedCount: number
  lastSyncTime: number | null
  isSyncing: boolean
}

export class SyncWorker {
  private repo: MatchRepository
  private supabase: SupabaseClient
  private isCustomClient: boolean
  private isSyncing = false
  private lastSyncTime: number | null = null
  private failedCount = 0
  private intervalId: NodeJS.Timeout | null = null
  private isLiveMatchActive = false

  constructor(
    repo: MatchRepository = defaultRepo,
    supabaseClient?: SupabaseClient,
  ) {
    this.repo = repo
    this.isCustomClient = Boolean(supabaseClient)
    this.supabase = supabaseClient ?? defaultSupabase
  }

  setLiveMatchActive(active: boolean) {
    this.isLiveMatchActive = active
  }

  start() {
    if (typeof window === 'undefined') return

    // Flush immediately on start
    void this.flushOutbox()

    // Setup event listeners
    window.addEventListener('online', () => void this.flushOutbox())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.flushOutbox()
      }
    })

    // Periodic flush: 15s interval
    this.intervalId = setInterval(() => {
      void this.flushOutbox()
    }, 15000)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  async getStats(): Promise<SyncStats> {
    const pendingCount = await this.repo.getOutboxCount()
    return {
      pendingCount,
      failedCount: this.failedCount,
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
    }
  }

  async flushOutbox(): Promise<void> {
    if (this.isSyncing) return
    if (!this.isCustomClient && !isSupabaseConfigured() && !this.isLiveMatchActive) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return

    const { data: { session } } = await this.supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) return

    this.isSyncing = true
    try {
      const items = await this.repo.getPendingOutbox(50)
      if (items.length === 0) {
        this.isSyncing = false
        this.lastSyncTime = Date.now()
        return
      }

      const batches = batchOutboxItems(items, 50)
      const successfullyProcessedIds: string[] = []

      for (const batch of batches) {
        try {
          if (batch.type === 'upsert_team') {
            for (const item of batch.items) {
              const team = item.payload as unknown as TeamRecord
              const { error } = await this.supabase.from('teams').upsert(
                {
                  id: team.id,
                  owner_id: userId,
                  name: team.name,
                  updated_at: new Date(team.updatedAt ?? Date.now()).toISOString(),
                  deleted_at: team.deletedAt ? new Date(team.deletedAt).toISOString() : null,
                },
                { onConflict: 'id' },
              )
              if (error) throw error
              successfullyProcessedIds.push(item.id)
            }
          } else if (batch.type === 'upsert_player') {
            for (const item of batch.items) {
              const player = item.payload as unknown as PlayerRecord
              const { error } = await this.supabase.from('players').upsert(
                {
                  id: player.id,
                  owner_id: userId,
                  team_id: player.teamId ?? null,
                  name: player.name,
                  updated_at: new Date(player.updatedAt ?? Date.now()).toISOString(),
                  deleted_at: player.deletedAt ? new Date(player.deletedAt).toISOString() : null,
                },
                { onConflict: 'id' },
              )
              if (error) throw error
              successfullyProcessedIds.push(item.id)
            }
          } else if (batch.type === 'upsert_match') {
            for (const item of batch.items) {
              const match = item.payload as unknown as MatchRecord
              const { error } = await this.supabase.from('matches').upsert(
                {
                  id: match.id,
                  owner_id: userId,
                  config: match.config,
                  team_a: { id: match.teamAId },
                  team_b: { id: match.teamBId },
                  status: match.status,
                  share_token: match.shareToken ?? null,
                  is_live: match.isLive ?? false,
                  tournament_id: match.tournamentId ?? null,
                  fixture_id: match.fixtureId ?? null,
                  updated_at: new Date(match.updatedAt ?? Date.now()).toISOString(),
                },
                { onConflict: 'id' },
              )
              if (error) throw error
              successfullyProcessedIds.push(item.id)
            }
          } else if (batch.type === 'upsert_tournament') {
            for (const item of batch.items) {
              const t = item.payload as unknown as Tournament
              const { error } = await this.supabase.from('tournaments').upsert(
                {
                  id: t.id,
                  owner_id: userId,
                  name: t.name,
                  format: t.format,
                  config: {
                    oversPerInnings: t.oversPerInnings,
                    playersPerSide: t.playersPerSide,
                    pointsRules: t.pointsRules,
                    tiebreakOrder: t.tiebreakOrder,
                    groupsCount: t.groupsCount,
                    qualifiersPerGroup: t.qualifiersPerGroup,
                    knockoutStages: t.knockoutStages,
                    seedingMode: t.seedingMode,
                    seedValue: t.seedValue,
                    manualStandingsOrder: t.manualStandingsOrder,
                  },
                  status: t.status,
                  is_public: t.isPublic,
                  share_token: t.shareToken,
                  deleted_at: t.deletedAt ? new Date(t.deletedAt).toISOString() : null,
                  updated_at: new Date(t.updatedAt ?? Date.now()).toISOString(),
                },
                { onConflict: 'id' },
              )
              if (error) throw error
              successfullyProcessedIds.push(item.id)
            }
          } else if (batch.type === 'upsert_tournament_team') {
            for (const item of batch.items) {
              const tt = item.payload as unknown as TournamentTeam
              const { error } = await this.supabase.from('tournament_teams').upsert(
                {
                  id: tt.id,
                  tournament_id: tt.tournamentId,
                  team_id: tt.teamId,
                  name_snapshot: tt.nameSnapshot,
                  group_id: tt.groupId ?? null,
                  seed: tt.seed ?? null,
                },
                { onConflict: 'id' },
              )
              if (error) throw error
              successfullyProcessedIds.push(item.id)
            }
          } else if (batch.type === 'upsert_fixture') {
            for (const item of batch.items) {
              const f = item.payload as unknown as Fixture
              const { error } = await this.supabase.from('fixtures').upsert(
                {
                  id: f.id,
                  tournament_id: f.tournamentId,
                  stage: f.stage,
                  round: f.round,
                  group_id: f.groupId ?? null,
                  home_team_id: f.homeTeamId ?? null,
                  away_team_id: f.awayTeamId ?? null,
                  scheduled_at: f.scheduledAt ? new Date(f.scheduledAt).toISOString() : null,
                  match_id: f.matchId ?? null,
                  status: f.status,
                  result_override: f.resultOverride ?? null,
                  bracket_slot: f.bracketSlot ?? null,
                  winner_advances_to_fixture_id: f.winnerAdvancesToFixtureId ?? null,
                  winner_advances_to_slot: f.winnerAdvancesToSlot ?? null,
                  loser_advances_to_fixture_id: f.loserAdvancesToFixtureId ?? null,
                  loser_advances_to_slot: f.loserAdvancesToSlot ?? null,
                  deleted_at: f.deletedAt ? new Date(f.deletedAt).toISOString() : null,
                  updated_at: new Date(f.updatedAt ?? Date.now()).toISOString(),
                },
                { onConflict: 'id' },
              )
              if (error) throw error
              successfullyProcessedIds.push(item.id)
            }
          } else if (batch.type === 'insert_ball') {
            const rows = batch.items.map((item) => {
              const data = item.payload as {
                id: string
                matchId: string
                sequence: number
                payload: BallEvent
              }
              return {
                id: data.id,
                match_id: data.matchId,
                seq: data.sequence,
                payload: data.payload,
              }
            })

            const { error } = await this.supabase
              .from('ball_events')
              .upsert(rows, { onConflict: 'id' })

            if (error) throw error
            successfullyProcessedIds.push(...batch.items.map((i) => i.id))
          } else if (batch.type === 'tombstone_ball') {
            for (const item of batch.items) {
              const data = item.payload as {
                id: string
                matchId: string
                deletedAt: number
              }
              const { error } = await this.supabase
                .from('ball_events')
                .update({ deleted_at: new Date(data.deletedAt).toISOString() })
                .eq('id', data.id)

              if (error) throw error
              successfullyProcessedIds.push(item.id)
            }
          }
        } catch (batchErr) {
          const errMessage = batchErr instanceof Error ? batchErr.message : 'Batch failed'
          this.failedCount++
          for (const item of batch.items) {
            await this.repo.markOutboxFailure(item.id, errMessage)
          }
          // Do not proceed with subsequent batches if a dependency failed
          break
        }
      }

      if (successfullyProcessedIds.length > 0) {
        await this.repo.removeOutboxItems(successfullyProcessedIds)
        this.lastSyncTime = Date.now()
      }
    } finally {
      this.isSyncing = false
    }
  }

  async pullUserData(userId: string): Promise<void> {
    if (!isSupabaseConfigured()) return

    // 1. Pull teams
    const { data: remoteTeams } = await this.supabase
      .from('teams')
      .select('*')
      .eq('owner_id', userId)

    if (remoteTeams) {
      for (const t of remoteTeams) {
        const local = (await this.repo.getTeams([t.id]))[0]
        const remoteRecord: TeamRecord = {
          id: t.id,
          ownerId: t.owner_id,
          name: t.name,
          playerIds: local?.playerIds ?? [],
          updatedAt: new Date(t.updated_at).getTime(),
          deletedAt: t.deleted_at ? new Date(t.deleted_at).getTime() : undefined,
        }
        if (!local) {
          await this.repo.saveTeam(remoteRecord)
        } else {
          const resolved = resolveConflict(local, remoteRecord)
          await this.repo.saveTeam(resolved)
        }
      }
    }

    // 2. Pull players
    const { data: remotePlayers } = await this.supabase
      .from('players')
      .select('*')
      .eq('owner_id', userId)

    if (remotePlayers) {
      for (const p of remotePlayers) {
        const local = (await this.repo.getPlayers([p.id]))[0]
        const remoteRecord: PlayerRecord = {
          id: p.id,
          ownerId: p.owner_id,
          name: p.name,
          teamId: p.team_id,
          updatedAt: new Date(p.updated_at).getTime(),
          deletedAt: p.deleted_at ? new Date(p.deleted_at).getTime() : undefined,
        }
        if (!local) {
          await this.repo.savePlayer(remoteRecord)
        } else {
          const resolved = resolveConflict(local, remoteRecord)
          await this.repo.savePlayer(resolved)
        }
      }
    }
  }
}

export const syncWorker = new SyncWorker()
