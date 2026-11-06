import type { BallEvent, MatchConfig } from '../engine/types'
import type { Tournament, TournamentTeam, Fixture } from '../tournament/types'
import type { TeamAvatarConfig } from '../teams/types'
import type { MatchRules, RulePresetType } from '../rules/types'

export type BattingStyle = 'RIGHT_HAND' | 'LEFT_HAND'
export type BowlingStyle =
  | 'RIGHT_ARM_FAST'
  | 'RIGHT_ARM_MEDIUM'
  | 'RIGHT_ARM_SPIN'
  | 'LEFT_ARM_FAST'
  | 'LEFT_ARM_MEDIUM'
  | 'LEFT_ARM_SPIN'
  | 'NONE'

export type OutboxOperationType =
  | 'upsert_team'
  | 'upsert_player'
  | 'upsert_match'
  | 'insert_ball'
  | 'tombstone_ball'
  | 'upsert_tournament'
  | 'upsert_tournament_team'
  | 'upsert_fixture'
  | 'upsert_match_rules'
  | 'update_player_profile'
  | 'update_team_identity'

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

export interface PlayerSnapshot {
  id: string
  name: string
  battingStyle?: BattingStyle
  bowlingStyle?: BowlingStyle
  avatarUrl?: string
  jerseyNumber?: number
}

export interface TeamSnapshot {
  id: string
  name: string
  captainPlayerId?: string
  viceCaptainPlayerId?: string
  avatar?: TeamAvatarConfig
  playerSnapshots: Record<string, PlayerSnapshot>
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
  rulesConfig?: MatchRules
  rulesPreset?: RulePresetType
  teamSnapshots?: {
    teamA: TeamSnapshot
    teamB: TeamSnapshot
  }
  createdAt: number
  updatedAt: number
}

export type { Tournament, TournamentTeam, Fixture }

export interface TeamRecord {
  id: string
  ownerId?: string
  name: string
  playerIds: string[]
  captainPlayerId?: string
  viceCaptainPlayerId?: string
  avatar?: TeamAvatarConfig
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
  battingStyle?: BattingStyle
  bowlingStyle?: BowlingStyle
  avatarUrl?: string
  jerseyNumber?: number
  email?: string
  phone?: string
  createdAt?: number
  updatedAt?: number
  deletedAt?: number
}

export interface MatchRulesRecord {
  id: string
  matchId: string
  presetType: RulePresetType
  rules: MatchRules
  updatedAt: number
}

export interface BallEventRecord {
  id: string
  matchId: string
  sequence: number
  event: BallEvent
  deletedAt?: number
}
