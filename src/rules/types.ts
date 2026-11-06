/**
 * PitchLog Match Rules Subsystem Types
 * Pure TypeScript definitions for configurable cricket rules and presets.
 */

export type RulePresetType =
  | 'standard_cricket'
  | 'gully_cricket'
  | 'tennis_ball_cricket'
  | 'society_cricket'
  | 'custom'

export interface OneTipOneHandRule {
  enabled: boolean
  maxBounces: number // typically 1
  maxHandsAllowed: number // typically 1 (single-handed catch)
  canTouchWallBeforeCatch: boolean // default false
  bowlerCredited: boolean // default true
  dismissalLabel: string // e.g. "One Tip One Hand"
}

export interface MankadRule {
  enabled: boolean
  bowlerCredited: boolean // false (MCC Law 38)
  allowWarningFirst: boolean // optional warning before dismissal
}

export interface HitWicketRule {
  enabled: boolean // default true
  bowlerCredited: boolean // default true
  freeHitExemption: boolean // default true (not out on free hit)
}

export type WallHitOutcome =
  | 'four_runs'
  | 'six_runs'
  | 'dead_ball'
  | 'out'
  | 'custom_runs'

export type WallTapOutcome =
  | 'one_run'
  | 'dead_ball'
  | 'boundary_four'
  | 'no_effect'

export interface WallRulesConfig {
  enabled: boolean
  directHitOutcome: WallHitOutcome
  directHitCustomRuns?: number
  tapOutcome: WallTapOutcome
  carOrWindowDirectHitOut: boolean
  canCatchOffWall: boolean
}

export interface PaceCallRule {
  /** PENDING CLARIFICATION: Placeholder for local bowling speed restrictions */
  enabled: boolean
  status: 'PENDING_SPECIFICATION'
  notes?: string
}

export interface DeadBallRule {
  allowManualDeclaration: boolean
  defaultRepeatDelivery: boolean
  awardPenaltyRuns: boolean
  penaltyRunsAmount: number
}

export interface MatchRules {
  id: string
  presetName: RulePresetType
  presetDisplayName: string
  version: number

  // Basic match structure
  oversPerInnings: number
  ballsPerOver: number // 4, 5, 6, 8, or 10 (default: 6)
  playersPerSide: number
  wicketsAllOut: number // e.g. playersPerSide - 1 or playersPerSide for LMS
  lastManStands: boolean

  // Gully & Local Rules
  oneTipOneHand: OneTipOneHandRule
  mankad: MankadRule
  hitWicket: HitWicketRule
  wallRules: WallRulesConfig
  paceCall: PaceCallRule
  deadBall: DeadBallRule

  // Standard Extras & Exemptions
  lbwEnabled: boolean
  wideReBowl: boolean
  wideRunsAwarded: number
  noBallReBowl: boolean
  noBallRunsAwarded: number
  noBallFreeHit: boolean
  byesEnabled: boolean
  legByesEnabled: boolean
  overthrowsEnabled: boolean
  superOverOvers?: number
}
