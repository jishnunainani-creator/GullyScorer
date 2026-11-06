import type { BallEvent, MatchConfig } from '../engine/types'
import type { Tournament, TournamentTeam, Fixture } from '../tournament/types'

export type OutboxOperationType =
  | 'upsert_team'
  | 'upsert_player'
  | 'upsert_match'
  | 'insert_ball'
  | 'tombstone_ball'
  | 'upsert_tournament'
  | 'upsert_tournament_team'
  | 'upsert_fixture'

export interface OutboxRecord {
  id: string
  type: OutboxOperationType
  entityId: string
  matchId?: string
  payload: Record<string, unknown>
  attempts: number
  lastError?: string
  createdAt: number
}

export interface MatchRecord {
  id: string
  ownerId?: string
  date: string
  config: MatchConfig
  teamAId: string
  teamBId: string
  tossWinnerId: string
  tossDecision: 'bat' | 'bowl'
  currentInningsNo: number
  innings1BattingTeamId: string
  innings1BowlingTeamId: string
  innings2BattingTeamId: string
  innings2BowlingTeamId: string
  innings1Openers: {
    strikerId: string
    nonStrikerId: string
    bowlerId: string
  }
  innings2Openers?: {
    strikerId: string
    nonStrikerId: string
    bowlerId: string
  }
  status: 'in_progress' | 'completed' | 'abandoned'
  shareToken?: string
  isLive?: boolean
  tournamentId?: string
  fixtureId?: string
  createdAt: number
  updatedAt: number
}

export type { Tournament, TournamentTeam, Fixture }

export interface TeamRecord {
  id: string
  ownerId?: string
  name: string
  playerIds: string[]
  createdAt?: number
  updatedAt?: number
  deletedAt?: number
}

export interface PlayerRecord {
  id: string
  ownerId?: string
  name: string
  teamId?: string
  leftHanded?: boolean
  createdAt?: number
  updatedAt?: number
  deletedAt?: number
}

export interface BallEventRecord {
  id: string
  matchId: string
  sequence: number
  event: BallEvent
  deletedAt?: number
}
