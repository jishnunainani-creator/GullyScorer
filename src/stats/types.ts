import type { WicketType, ShotZone } from '../engine/types'
import type { PlayerRecord } from '../db/schema'

export type PlayerRole = 'batter' | 'bowler' | 'all_rounder' | 'player'

export type MatchPhase = 'powerplay' | 'middle' | 'death'

export interface BattingInningsStats {
  playerId: string
  matchId: string
  inningsNo: number
  runs: number
  ballsFaced: number
  fours: number
  sixes: number
  dotBalls: number
  strikeRate: number
  isOut: boolean
  dismissalType?: WicketType
  bowlerId?: string
  fielderId?: string
  shotZones: Record<ShotZone, number>
}

export interface BattingCareerStats {
  playerId: string
  matches: number
  innings: number
  notOuts: number
  runs: number
  ballsFaced: number
  highestScore: number
  highestScoreNotOut: boolean
  average: number | null
  strikeRate: number
  fours: number
  sixes: number
  thirties: number
  fifties: number
  centuries: number
  ducks: number
  goldenDucks: number
  dotBalls: number
  dotBallPercentage: number
  boundaryPercentage: number
  dismissalBreakdown: Record<WicketType, number>
}

export interface BowlingInningsStats {
  playerId: string
  matchId: string
  inningsNo: number
  ballsBowled: number
  overs: string
  maidens: number
  runsConceded: number
  wickets: number
  economy: number
  strikeRate: number | null
  average: number | null
  dotBalls: number
  widesConceded: number
  noBallsConceded: number
  wicketTypes: Record<WicketType, number>
  hatTricks: number
}

export interface BowlingCareerStats {
  playerId: string
  matches: number
  innings: number
  ballsBowled: number
  overs: string
  maidens: number
  runsConceded: number
  wickets: number
  average: number | null
  economy: number
  strikeRate: number | null
  bestFiguresWickets: number
  bestFiguresRuns: number
  bestFiguresDisplay: string
  threeWickets: number
  fiveWickets: number
  dotBalls: number
  dotBallPercentage: number
  widesConceded: number
  noBallsConceded: number
  hatTricks: number
  wicketTypes: Record<WicketType, number>
}

export interface FieldingCareerStats {
  playerId: string
  catches: number
  runOuts: number
  stumpings: number
  totalDismissals: number
}

export interface Partnership {
  batter1Id: string
  batter2Id: string
  runs: number
  balls: number
  batter1Runs: number
  batter2Runs: number
}

export interface FallOfWicket {
  wicketNo: number
  score: number
  balls: number
  overs: string
  playerOutId: string
}

export interface HeadToHeadStats {
  batterId: string
  bowlerId: string
  ballsFaced: number
  runs: number
  dismissals: number
  dotBalls: number
  fours: number
  sixes: number
  strikeRate: number
}

export interface PhaseStats {
  phase: MatchPhase
  runs: number
  balls: number
  wickets: number
  runRate: number
}

export interface MvpBreakdown {
  playerId: string
  battingPoints: number
  bowlingPoints: number
  fieldingPoints: number
  bonusPoints: number
  totalPoints: number
  runs: number
  wickets: number
  catches: number
  runOuts: number
  stumpings: number
}

export interface MatchAnalysis {
  matchId: string
  partnerships: Record<number, Partnership[]>
  bestPartnerships: Record<number, Partnership | null>
  fallOfWickets: Record<number, FallOfWicket[]>
  runsPerOver: Record<number, number[]>
  cumulativeRunsPerOver: Record<number, number[]>
  wicketsPerOver: Record<number, number[]>
  mvpRanking: MvpBreakdown[]
  playerOfTheMatch: MvpBreakdown | null
  bestBatter: MvpBreakdown | null
  bestBowler: MvpBreakdown | null
  bestFielder: MvpBreakdown | null
}

export interface PlayerCareerStats {
  player: PlayerRecord
  role: PlayerRole
  matchesCount: number
  batting: BattingCareerStats
  bowling: BowlingCareerStats
  fielding: FieldingCareerStats
  recentScores: number[]
  recentBowlingFigures: string[]
  mvpPoints: number
}

export type MilestoneBadgeId =
  | 'first_match'
  | 'first_fifty'
  | 'first_century'
  | 'five_wicket_haul'
  | 'hat_trick'
  | 'century_runs'
  | 'century_wickets'
  | 'golden_duck'
  | 'super_striker'
  | 'economical_spell'

export interface MilestoneBadge {
  id: MilestoneBadgeId
  title: string
  description: string
  icon: string
  achievedAtMatchId?: string
}
