export type TournamentFormat =
  | 'league'
  | 'double_league'
  | 'groups_knockout'
  | 'knockout'

export type TournamentStatus =
  | 'draft'
  | 'in_progress'
  | 'completed'
  | 'archived'

export type TournamentStage =
  | 'league'
  | 'group'
  | 'round_of_16'
  | 'quarter'
  | 'semi'
  | 'final'
  | 'third_place'

export type FixtureStatus =
  | 'scheduled'
  | 'live'
  | 'completed'
  | 'abandoned'
  | 'walkover'

export type TiebreakCriterion =
  | 'points'
  | 'wins'
  | 'nrr'
  | 'headToHead'
  | 'fewerLosses'
  | 'manual'

export type SeedingMode = 'seeded' | 'random' | 'snake'

export interface PointsRules {
  win: number
  tie: number
  noResult: number
  loss: number
  bonusEnabled?: boolean
}

export interface ResultOverride {
  type:
    | 'walkover'
    | 'abandoned'
    | 'no_result'
    | 'revised_target'
    | 'tie_decided_manually'
  winnerTeamId?: string
  revisedTarget?: number
  revisedOvers?: number
  revisedQuotaBalls?: number
  note?: string
}

export interface BracketSlot {
  slotNumber: number
  homeSource?: string // e.g. "A1", "Winner of QF1"
  awaySource?: string // e.g. "B2", "Winner of QF2"
}

export interface Tournament {
  id: string
  ownerId?: string
  name: string
  format: TournamentFormat
  oversPerInnings: number
  playersPerSide: number
  pointsRules: PointsRules
  tiebreakOrder: TiebreakCriterion[]
  groupsCount: number
  qualifiersPerGroup: number
  knockoutStages: TournamentStage[]
  seedingMode: SeedingMode
  seedValue: number
  isPublic: boolean
  shareToken: string
  status: TournamentStatus
  manualStandingsOrder?: Record<string, string[]> // groupId -> array of teamIds
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
}

export interface TournamentTeam {
  id: string
  tournamentId: string
  teamId: string
  nameSnapshot: string
  groupId?: string
  seed?: number
}

export interface Fixture {
  id: string
  tournamentId: string
  stage: TournamentStage
  round: number
  groupId?: string
  homeTeamId: string | null
  awayTeamId: string | null
  scheduledAt?: number
  venue?: string
  matchId?: string
  status: FixtureStatus
  resultOverride?: ResultOverride
  bracketSlot?: BracketSlot
  winnerAdvancesToFixtureId?: string
  winnerAdvancesToSlot?: 'home' | 'away'
  loserAdvancesToFixtureId?: string
  loserAdvancesToSlot?: 'home' | 'away'
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
}

export interface TournamentInningsSummary {
  teamId: string
  runs: number
  wickets: number
  legalBalls: number // integer balls actually faced
  oversString: string
  isAllOut: boolean
  allocatedQuotaBalls: number // integer balls quota (e.g. 120 for 20 overs)
}

export interface TournamentResult {
  fixtureId: string
  matchId: string
  winnerTeamId: string | null
  isTie: boolean
  isNoResult: boolean
  isSuperOver: boolean
  superOverWinnerId?: string | null
  marginText: string
  innings1: TournamentInningsSummary
  innings2: TournamentInningsSummary
  revisedTarget?: number
  revisedQuotaBalls?: number
}

export interface TeamStandingsRow {
  teamId: string
  teamName: string
  groupId?: string
  played: number
  won: number
  lost: number
  tied: number
  noResult: number
  points: number
  nrr: number
  nrrText: string
  runsFor: number
  oversForBalls: number // integer balls for base-6 calculation
  oversForString: string
  runsAgainst: number
  oversAgainstBalls: number // integer balls for base-6 calculation
  oversAgainstString: string
  last5Form: ('W' | 'L' | 'T' | 'N')[]
  rank: number
  qualificationStatus?: 'qualified' | 'eliminated' | 'in_contention'
}
