export type ExtraType = 'wide' | 'noball' | 'bye' | 'legbye' | 'penalty'

export type WicketType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'runout'
  | 'stumped'
  | 'hitwicket'
  | 'retired'

export interface ExtraInfo {
  type: ExtraType
  runs: number
}

export interface WicketInfo {
  type: WicketType
  playerOutId: string
  fielderId?: string
}

export interface Player {
  id: string
  name: string
}

export interface Team {
  id: string
  name: string
  playerIds: string[]
}

export interface MatchConfig {
  oversPerInnings: number
  playersPerSide: number
  wideReBowl: boolean
  noBallFreeHit: boolean
  lastManStands: boolean
  superOverOvers?: number
}

export type ShotZone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export interface BallEvent {
  id: string
  inningsNo: number
  batterId: string
  nonStrikerId: string
  bowlerId: string
  runsOffBat: number
  extra: ExtraInfo | null
  wicket: WicketInfo | null
  isBoundary4: boolean
  isBoundary6: boolean
  shot?: { zone: ShotZone }
  timestamp: number
}

export interface BatterStats {
  playerId: string
  runs: number
  ballsFaced: number
  fours: number
  sixes: number
  strikeRate: number
  isOut: boolean
  dismissal?: {
    type: WicketType
    bowlerId?: string
    fielderId?: string
  }
}

export interface BowlerStats {
  playerId: string
  ballsBowled: number
  overs: string
  maidens: number
  runsConceded: number
  wickets: number
  economy: number
  wides: number
  noBalls: number
}

export interface Partnership {
  batter1Id: string
  batter2Id: string
  runs: number
  balls: number
}

export interface FallOfWicket {
  wicketNumber: number
  score: number
  playerOutId: string
  over: string
  partnershipRuns: number
}

export type InningsEndReason = 'all_out' | 'overs_complete' | 'target_chased'

export interface ExtrasBreakdown {
  wides: number
  noBalls: number
  byes: number
  legByes: number
  penalties: number
  total: number
}

export interface ChaseInfo {
  target: number
  runsNeeded: number
  ballsRemaining: number
  requiredRunRate: number
  formattedText: string
}

export interface Innings {
  inningsNo: number
  battingTeamId?: string
  bowlingTeamId?: string
  totalRuns: number
  wickets: number
  legalBalls: number
  overs: string
  currentStrikerId: string | null
  currentNonStrikerId: string | null
  currentBowlerId: string | null
  isFreeHit: boolean
  isComplete: boolean
  endReason: InningsEndReason | null
  target: number | null
  batterStats: Record<string, BatterStats>
  bowlerStats: Record<string, BowlerStats>
  partnerships: Partnership[]
  currentPartnership: Partnership | null
  fallOfWickets: FallOfWicket[]
  extras: ExtrasBreakdown
  events: BallEvent[]
  chaseInfo: ChaseInfo | null
}

export interface MatchState {
  config: MatchConfig
  teamA: Team
  teamB: Team
  innings: Innings[]
  currentInningsNo: number
  status: 'not_started' | 'in_progress' | 'completed' | 'super_over'
  winnerTeamId: string | null
  resultText: string | null
}
