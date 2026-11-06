import { db as defaultDb, PitchLogDatabase } from './db'
import type {
  MatchRecord,
  TeamRecord,
  PlayerRecord,
  BallEventRecord,
  OutboxRecord,
  Tournament,
  TournamentTeam,
  Fixture,
} from './schema'
import type { BallEvent, ShotZone } from '../engine/types'
import { remapPlayerIdInEvents } from '../stats/identity'

export class MatchRepository {
  private database: PitchLogDatabase

  constructor(database: PitchLogDatabase = defaultDb) {
    this.database = database
  }

  async createMatch(
    match: MatchRecord,
    teams: TeamRecord[],
    players: PlayerRecord[],
  ): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.matches,
      this.database.teams,
      this.database.players,
      this.database.outbox,
      async () => {
        await this.database.matches.put(match)
        for (const team of teams) {
          await this.database.teams.put(team)
          await this.database.outbox.put({
            id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'upsert_team',
            entityId: team.id,
            payload: team as unknown as Record<string, unknown>,
            attempts: 0,
            createdAt: Date.now(),
          })
        }
        for (const player of players) {
          await this.database.players.put(player)
          await this.database.outbox.put({
            id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'upsert_player',
            entityId: player.id,
            payload: player as unknown as Record<string, unknown>,
            attempts: 0,
            createdAt: Date.now(),
          })
        }

        await this.database.outbox.put({
          id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'upsert_match',
          entityId: match.id,
          payload: match as unknown as Record<string, unknown>,
          attempts: 0,
          createdAt: Date.now(),
        })
      },
    )
  }

  async getMatch(matchId: string): Promise<MatchRecord | undefined> {
    return this.database.matches.get(matchId)
  }

  async listMatches(): Promise<MatchRecord[]> {
    return this.database.matches.orderBy('updatedAt').reverse().toArray()
  }

  async getTeams(teamIds: string[]): Promise<TeamRecord[]> {
    return this.database.teams.where('id').anyOf(teamIds).toArray()
  }

  async listTeams(): Promise<TeamRecord[]> {
    const teams = await this.database.teams.toArray()
    return teams.filter((t) => !t.deletedAt)
  }

  async saveTeam(team: TeamRecord): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.teams,
      this.database.outbox,
      async () => {
        await this.database.teams.put(team)
        await this.database.outbox.put({
          id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'upsert_team',
          entityId: team.id,
          payload: team as unknown as Record<string, unknown>,
          attempts: 0,
          createdAt: Date.now(),
        })
      },
    )
  }

  async deleteTeam(teamId: string): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.teams,
      this.database.outbox,
      async () => {
        const team = await this.database.teams.get(teamId)
        if (!team) return
        const updated = { ...team, deletedAt: Date.now(), updatedAt: Date.now() }
        await this.database.teams.put(updated)
        await this.database.outbox.put({
          id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'upsert_team',
          entityId: team.id,
          payload: updated as unknown as Record<string, unknown>,
          attempts: 0,
          createdAt: Date.now(),
        })
      },
    )
  }

  async getPlayers(playerIds: string[]): Promise<PlayerRecord[]> {
    return this.database.players.where('id').anyOf(playerIds).toArray()
  }

  async listPlayers(): Promise<PlayerRecord[]> {
    const players = await this.database.players.toArray()
    return players.filter((p) => !p.deletedAt)
  }

  async savePlayer(player: PlayerRecord): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.players,
      this.database.outbox,
      async () => {
        await this.database.players.put(player)
        await this.database.outbox.put({
          id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'upsert_player',
          entityId: player.id,
          payload: player as unknown as Record<string, unknown>,
          attempts: 0,
          createdAt: Date.now(),
        })
      },
    )
  }

  async deletePlayer(playerId: string): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.players,
      this.database.outbox,
      async () => {
        const player = await this.database.players.get(playerId)
        if (!player) return
        const updated = { ...player, deletedAt: Date.now(), updatedAt: Date.now() }
        await this.database.players.put(updated)
        await this.database.outbox.put({
          id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'upsert_player',
          entityId: player.id,
          payload: updated as unknown as Record<string, unknown>,
          attempts: 0,
          createdAt: Date.now(),
        })
      },
    )
  }

  async getBallEvents(matchId: string): Promise<BallEvent[]> {
    const records = await this.database.ballEvents
      .where('matchId')
      .equals(matchId)
      .sortBy('sequence')

    // Filter out deleted/tombstoned events
    return records.filter((r) => !r.deletedAt).map((r) => r.event)
  }

  async addBallEvent(matchId: string, event: BallEvent): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.ballEvents,
      this.database.matches,
      this.database.outbox,
      async () => {
        const lastRecords = await this.database.ballEvents
          .where('matchId')
          .equals(matchId)
          .toArray()

        let nextSequence = 1
        if (lastRecords.length > 0) {
          const maxSeq = Math.max(...lastRecords.map((r) => r.sequence))
          nextSequence = maxSeq + 1
        }

        const record: BallEventRecord = {
          id: event.id,
          matchId,
          sequence: nextSequence,
          event,
        }

        await this.database.ballEvents.put(record)
        await this.database.matches.update(matchId, {
          updatedAt: Date.now(),
        })

        // Enqueue to outbox atomically
        await this.database.outbox.put({
          id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'insert_ball',
          entityId: event.id,
          matchId,
          payload: {
            id: event.id,
            matchId,
            sequence: nextSequence,
            payload: event,
          },
          attempts: 0,
          createdAt: Date.now(),
        })
      },
    )
  }

  async removeLastBallEvent(
    matchId: string,
    inningsNo: number,
  ): Promise<BallEvent | null> {
    return this.database.transaction(
      'rw',
      this.database.ballEvents,
      this.database.matches,
      this.database.outbox,
      async () => {
        const records = await this.database.ballEvents
          .where('matchId')
          .equals(matchId)
          .toArray()

        // Only look at active (non-deleted) records
        const activeRecords = records.filter((r) => !r.deletedAt)
        activeRecords.sort((a, b) => b.sequence - a.sequence)
        const target = activeRecords.find((r) => r.event.inningsNo === inningsNo)

        if (!target) {
          return null
        }

        // Soft-delete with tombstone locally and delete from active queries
        const tombstoned: BallEventRecord = {
          ...target,
          deletedAt: Date.now(),
        }
        await this.database.ballEvents.put(tombstoned)
        await this.database.matches.update(matchId, {
          updatedAt: Date.now(),
        })

        // Enqueue tombstone to outbox atomically
        await this.database.outbox.put({
          id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'tombstone_ball',
          entityId: target.id,
          matchId,
          payload: {
            id: target.id,
            matchId,
            deletedAt: Date.now(),
          },
          attempts: 0,
          createdAt: Date.now(),
        })

        return target.event
      },
    )
  }

  async updateLastBallShot(
    matchId: string,
    inningsNo: number,
    zone: ShotZone,
  ): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.ballEvents,
      this.database.matches,
      this.database.outbox,
      async () => {
        const records = await this.database.ballEvents
          .where('matchId')
          .equals(matchId)
          .sortBy('sequence')

        const activeInningsBalls = records.filter(
          (r) => !r.deletedAt && r.event.inningsNo === inningsNo,
        )
        const target = activeInningsBalls[activeInningsBalls.length - 1]
        if (!target) return

        const updatedEvent: BallEvent = {
          ...target.event,
          shot: { zone },
        }

        const updatedRecord: BallEventRecord = {
          ...target,
          event: updatedEvent,
        }

        await this.database.ballEvents.put(updatedRecord)
        await this.database.matches.update(matchId, {
          updatedAt: Date.now(),
        })

        // Enqueue update to outbox
        await this.database.outbox.put({
          id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'insert_ball',
          entityId: target.id,
          matchId,
          payload: {
            id: target.id,
            matchId,
            sequence: target.sequence,
            payload: updatedEvent,
          },
          attempts: 0,
          createdAt: Date.now(),
        })
      },
    )
  }

  async updateMatch(
    matchId: string,
    updates: Partial<MatchRecord>,
  ): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.matches,
      this.database.outbox,
      async () => {
        await this.database.matches.update(matchId, {
          ...updates,
          updatedAt: Date.now(),
        })
        const updatedMatch = await this.database.matches.get(matchId)
        if (updatedMatch) {
          await this.database.outbox.put({
            id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'upsert_match',
            entityId: matchId,
            payload: updatedMatch as unknown as Record<string, unknown>,
            attempts: 0,
            createdAt: Date.now(),
          })
        }
      },
    )
  }

  async deleteMatch(matchId: string): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.matches,
      this.database.ballEvents,
      this.database.outbox,
      async () => {
        await this.database.matches.delete(matchId)
        await this.database.ballEvents.where('matchId').equals(matchId).delete()
        await this.database.outbox.where('matchId').equals(matchId).delete()
      },
    )
  }

  // Outbox operations
  async getPendingOutbox(limit = 50): Promise<OutboxRecord[]> {
    return this.database.outbox.orderBy('createdAt').limit(limit).toArray()
  }

  async removeOutboxItems(ids: string[]): Promise<void> {
    await this.database.outbox.bulkDelete(ids)
  }

  async markOutboxFailure(id: string, error: string): Promise<void> {
    const item = await this.database.outbox.get(id)
    if (item) {
      await this.database.outbox.update(id, {
        attempts: item.attempts + 1,
        lastError: error,
      })
    }
  }

  async getOutboxCount(): Promise<number> {
    return this.database.outbox.count()
  }

  async claimAllLocalData(userId: string): Promise<number> {
    return this.database.transaction(
      'rw',
      this.database.matches,
      this.database.teams,
      this.database.players,
      this.database.ballEvents,
      this.database.outbox,
      async () => {
        const matches = await this.database.matches.toArray()
        const teams = await this.database.teams.toArray()
        const players = await this.database.players.toArray()
        const ballEvents = await this.database.ballEvents.toArray()

        for (const m of matches) {
          const updated = { ...m, ownerId: userId, updatedAt: Date.now() }
          await this.database.matches.put(updated)
          await this.database.outbox.put({
            id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'upsert_match',
            entityId: m.id,
            payload: updated as unknown as Record<string, unknown>,
            attempts: 0,
            createdAt: Date.now(),
          })
        }

        for (const t of teams) {
          const updated = { ...t, ownerId: userId, updatedAt: Date.now() }
          await this.database.teams.put(updated)
          await this.database.outbox.put({
            id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'upsert_team',
            entityId: t.id,
            payload: updated as unknown as Record<string, unknown>,
            attempts: 0,
            createdAt: Date.now(),
          })
        }

        for (const p of players) {
          const updated = { ...p, ownerId: userId, updatedAt: Date.now() }
          await this.database.players.put(updated)
          await this.database.outbox.put({
            id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'upsert_player',
            entityId: p.id,
            payload: updated as unknown as Record<string, unknown>,
            attempts: 0,
            createdAt: Date.now(),
          })
        }

        for (const b of ballEvents) {
          if (!b.deletedAt) {
            await this.database.outbox.put({
              id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: 'insert_ball',
              entityId: b.id,
              matchId: b.matchId,
              payload: {
                id: b.id,
                matchId: b.matchId,
                sequence: b.sequence,
                payload: b.event,
              },
              attempts: 0,
              createdAt: Date.now(),
            })
          }
        }

        return matches.length
      },
    )
  }

  async exportAllData(): Promise<{
    exportDate: string
    version: string
    matches: MatchRecord[]
    teams: TeamRecord[]
    players: PlayerRecord[]
    ballEvents: BallEventRecord[]
  }> {
    const matches = await this.database.matches.toArray()
    const teams = await this.database.teams.toArray()
    const players = await this.database.players.toArray()
    const ballEvents = await this.database.ballEvents.toArray()

    return {
      exportDate: new Date().toISOString(),
      version: '0.3.0',
      matches,
      teams,
      players,
      ballEvents,
    }
  }

  async mergePlayers(
    sourcePlayerId: string,
    targetPlayerId: string,
  ): Promise<{ affectedBalls: number; affectedTeams: number }> {
    return this.database.transaction(
      'rw',
      this.database.ballEvents,
      this.database.teams,
      this.database.players,
      this.database.outbox,
      async () => {
        let affectedBalls = 0
        let affectedTeams = 0

        // 1. Remap all ball events involving sourcePlayerId
        const allBalls = await this.database.ballEvents.toArray()
        for (const b of allBalls) {
          const { remappedEvents, changedCount } = remapPlayerIdInEvents(
            [b.event],
            sourcePlayerId,
            targetPlayerId,
          )
          if (changedCount > 0 && remappedEvents[0]) {
            affectedBalls++
            const updatedRecord: BallEventRecord = {
              ...b,
              event: remappedEvents[0],
            }
            await this.database.ballEvents.put(updatedRecord)

            // Enqueue outbox update
            await this.database.outbox.put({
              id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: 'insert_ball',
              entityId: updatedRecord.id,
              matchId: updatedRecord.matchId,
              payload: {
                id: updatedRecord.id,
                matchId: updatedRecord.matchId,
                sequence: updatedRecord.sequence,
                payload: updatedRecord.event,
              },
              attempts: 0,
              createdAt: Date.now(),
            })
          }
        }

        // 2. Remap team rosters
        const allTeams = await this.database.teams.toArray()
        for (const t of allTeams) {
          if (t.playerIds.includes(sourcePlayerId)) {
            affectedTeams++
            const newPlayerIds = Array.from(
              new Set(
                t.playerIds.map((id) => (id === sourcePlayerId ? targetPlayerId : id)),
              ),
            )
            const updatedTeam: TeamRecord = {
              ...t,
              playerIds: newPlayerIds,
              updatedAt: Date.now(),
            }
            await this.database.teams.put(updatedTeam)
            await this.database.outbox.put({
              id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: 'upsert_team',
              entityId: updatedTeam.id,
              payload: updatedTeam as unknown as Record<string, unknown>,
              attempts: 0,
              createdAt: Date.now(),
            })
          }
        }

        // 3. Soft-delete the source player
        const sourcePlayer = await this.database.players.get(sourcePlayerId)
        if (sourcePlayer) {
          const updatedSource: PlayerRecord = {
            ...sourcePlayer,
            deletedAt: Date.now(),
            updatedAt: Date.now(),
          }
          await this.database.players.put(updatedSource)
          await this.database.outbox.put({
            id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'upsert_player',
            entityId: updatedSource.id,
            payload: updatedSource as unknown as Record<string, unknown>,
            attempts: 0,
            createdAt: Date.now(),
          })
        }

        return { affectedBalls, affectedTeams }
      },
    )
  }

  // ==========================================
  // Tournament Operations (Phase 5)
  // ==========================================

  async saveTournament(tournament: Tournament): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.tournaments,
      this.database.outbox,
      async () => {
        await this.database.tournaments.put(tournament)
        await this.database.outbox.put({
          id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'upsert_tournament',
          entityId: tournament.id,
          payload: tournament as unknown as Record<string, unknown>,
          attempts: 0,
          createdAt: Date.now(),
        })
      },
    )
  }

  async getTournament(id: string): Promise<Tournament | undefined> {
    const t = await this.database.tournaments.get(id)
    return t && !t.deletedAt ? t : undefined
  }

  async listTournaments(): Promise<Tournament[]> {
    const all = await this.database.tournaments.toArray()
    return all.filter((t) => !t.deletedAt)
  }

  async deleteTournament(id: string): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.tournaments,
      this.database.outbox,
      async () => {
        const t = await this.database.tournaments.get(id)
        if (t) {
          const updated: Tournament = {
            ...t,
            deletedAt: Date.now(),
            updatedAt: Date.now(),
          }
          await this.database.tournaments.put(updated)
          await this.database.outbox.put({
            id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'upsert_tournament',
            entityId: id,
            payload: updated as unknown as Record<string, unknown>,
            attempts: 0,
            createdAt: Date.now(),
          })
        }
      },
    )
  }

  async saveTournamentTeams(teams: TournamentTeam[]): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.tournamentTeams,
      this.database.outbox,
      async () => {
        for (const team of teams) {
          await this.database.tournamentTeams.put(team)
          await this.database.outbox.put({
            id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'upsert_tournament_team',
            entityId: team.id,
            payload: team as unknown as Record<string, unknown>,
            attempts: 0,
            createdAt: Date.now(),
          })
        }
      },
    )
  }

  async getTournamentTeams(tournamentId: string): Promise<TournamentTeam[]> {
    return this.database.tournamentTeams
      .where('tournamentId')
      .equals(tournamentId)
      .toArray()
  }

  async saveFixtures(fixtures: Fixture[]): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.fixtures,
      this.database.outbox,
      async () => {
        for (const f of fixtures) {
          await this.database.fixtures.put(f)
          await this.database.outbox.put({
            id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'upsert_fixture',
            entityId: f.id,
            payload: f as unknown as Record<string, unknown>,
            attempts: 0,
            createdAt: Date.now(),
          })
        }
      },
    )
  }

  async getFixtures(tournamentId: string): Promise<Fixture[]> {
    const list = await this.database.fixtures
      .where('tournamentId')
      .equals(tournamentId)
      .toArray()
    return list.filter((f) => !f.deletedAt)
  }

  async updateFixture(fixtureId: string, updates: Partial<Fixture>): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.fixtures,
      this.database.outbox,
      async () => {
        const existing = await this.database.fixtures.get(fixtureId)
        if (existing) {
          const updated: Fixture = {
            ...existing,
            ...updates,
            updatedAt: Date.now(),
          }
          await this.database.fixtures.put(updated)
          await this.database.outbox.put({
            id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'upsert_fixture',
            entityId: fixtureId,
            payload: updated as unknown as Record<string, unknown>,
            attempts: 0,
            createdAt: Date.now(),
          })
        }
      },
    )
  }

  async deleteFixture(fixtureId: string): Promise<void> {
    const existing = await this.database.fixtures.get(fixtureId)
    if (!existing) return
    if (existing.matchId) {
      const match = await this.database.matches.get(existing.matchId)
      if (match && match.status === 'completed') {
        throw new Error('Cannot delete fixture with a completed match. Detach the match first.')
      }
    }
    await this.updateFixture(fixtureId, { deletedAt: Date.now() })
  }

  async attachMatchToFixture(
    fixtureId: string,
    matchId: string,
    tournamentId: string,
  ): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.fixtures,
      this.database.matches,
      this.database.outbox,
      async () => {
        await this.updateFixture(fixtureId, { matchId, status: 'completed' })
        await this.updateMatch(matchId, { tournamentId, fixtureId })
      },
    )
  }
}

export const repository = new MatchRepository(defaultDb)
