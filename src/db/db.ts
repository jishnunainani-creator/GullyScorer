import Dexie, { type Table } from 'dexie'
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

export class PitchLogDatabase extends Dexie {
  matches!: Table<MatchRecord, string>
  teams!: Table<TeamRecord, string>
  players!: Table<PlayerRecord, string>
  ballEvents!: Table<BallEventRecord, string>
  outbox!: Table<OutboxRecord, string>
  tournaments!: Table<Tournament, string>
  tournamentTeams!: Table<TournamentTeam, string>
  fixtures!: Table<Fixture, string>

  constructor(databaseName = 'PitchLogDB') {
    super(databaseName)
    this.version(1).stores({
      matches: 'id, date, status, updatedAt',
      teams: 'id, name',
      players: 'id, teamId, name',
      ballEvents: 'id, matchId, sequence, [matchId+sequence]',
    })

    this.version(2).stores({
      matches: 'id, date, status, updatedAt, shareToken, isLive',
      teams: 'id, name, deletedAt',
      players: 'id, teamId, name, deletedAt',
      ballEvents: 'id, matchId, sequence, [matchId+sequence], deletedAt',
      outbox: 'id, type, entityId, matchId, createdAt, attempts',
    })

    this.version(3).stores({
      matches: 'id, date, status, updatedAt, shareToken, isLive, tournamentId, fixtureId',
      teams: 'id, name, deletedAt',
      players: 'id, teamId, name, deletedAt',
      ballEvents: 'id, matchId, sequence, [matchId+sequence], deletedAt',
      outbox: 'id, type, entityId, matchId, createdAt, attempts',
      tournaments: 'id, ownerId, status, isPublic, shareToken, updatedAt, deletedAt',
      tournamentTeams: 'id, tournamentId, teamId, groupId',
      fixtures: 'id, tournamentId, stage, round, groupId, matchId, status, updatedAt, deletedAt',
    })
  }
}

export const db = new PitchLogDatabase()
