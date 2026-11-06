/**
 * PitchLog Match Rules Presets
 * Pre-configured rules for standard, gully, tennis-ball, society, and custom matches.
 */

import type { MatchRules, RulePresetType } from './types'

export const STANDARD_CRICKET_PRESET: MatchRules = {
  id: 'preset_standard',
  presetName: 'standard_cricket',
  presetDisplayName: 'Standard Cricket',
  version: 1,

  oversPerInnings: 20,
  ballsPerOver: 6,
  playersPerSide: 11,
  wicketsAllOut: 10,
  lastManStands: false,

  oneTipOneHand: {
    enabled: false,
    maxBounces: 1,
    maxHandsAllowed: 1,
    canTouchWallBeforeCatch: false,
    bowlerCredited: true,
    dismissalLabel: 'One Tip One Hand',
  },
  mankad: {
    enabled: true,
    bowlerCredited: false,
    allowWarningFirst: false,
  },
  hitWicket: {
    enabled: true,
    bowlerCredited: true,
    freeHitExemption: true,
  },
  wallRules: {
    enabled: false,
    directHitOutcome: 'four_runs',
    tapOutcome: 'no_effect',
    carOrWindowDirectHitOut: false,
    canCatchOffWall: false,
  },
  paceCall: {
    enabled: false,
    status: 'PENDING_SPECIFICATION',
  },
  deadBall: {
    allowManualDeclaration: true,
    defaultRepeatDelivery: true,
    awardPenaltyRuns: false,
    penaltyRunsAmount: 0,
  },

  lbwEnabled: true,
  wideReBowl: true,
  wideRunsAwarded: 1,
  noBallReBowl: true,
  noBallRunsAwarded: 1,
  noBallFreeHit: true,
  byesEnabled: true,
  legByesEnabled: true,
  overthrowsEnabled: true,
  superOverOvers: 1,
}

export const GULLY_CRICKET_PRESET: MatchRules = {
  id: 'preset_gully',
  presetName: 'gully_cricket',
  presetDisplayName: 'Gully Cricket',
  version: 1,

  oversPerInnings: 6,
  ballsPerOver: 6,
  playersPerSide: 6,
  wicketsAllOut: 6, // Last man stands default in gully
  lastManStands: true,

  oneTipOneHand: {
    enabled: true,
    maxBounces: 1,
    maxHandsAllowed: 1,
    canTouchWallBeforeCatch: false,
    bowlerCredited: true,
    dismissalLabel: 'One Tip One Hand',
  },
  mankad: {
    enabled: true,
    bowlerCredited: false,
    allowWarningFirst: false,
  },
  hitWicket: {
    enabled: true,
    bowlerCredited: true,
    freeHitExemption: true,
  },
  wallRules: {
    enabled: true,
    directHitOutcome: 'four_runs',
    tapOutcome: 'one_run',
    carOrWindowDirectHitOut: true,
    canCatchOffWall: false,
  },
  paceCall: {
    enabled: false,
    status: 'PENDING_SPECIFICATION',
  },
  deadBall: {
    allowManualDeclaration: true,
    defaultRepeatDelivery: true,
    awardPenaltyRuns: false,
    penaltyRunsAmount: 0,
  },

  lbwEnabled: false, // "Gully me LBW nahi hota"
  wideReBowl: true,
  wideRunsAwarded: 1,
  noBallReBowl: true,
  noBallRunsAwarded: 1,
  noBallFreeHit: false, // Standard street rule
  byesEnabled: true,
  legByesEnabled: false, // Leg-byes generally not allowed in gully
  overthrowsEnabled: false, // Ball is dead on throw in narrow streets
  superOverOvers: 1,
}

export const TENNIS_BALL_CRICKET_PRESET: MatchRules = {
  id: 'preset_tennis',
  presetName: 'tennis_ball_cricket',
  presetDisplayName: 'Tennis Ball Cricket',
  version: 1,

  oversPerInnings: 8,
  ballsPerOver: 6,
  playersPerSide: 8,
  wicketsAllOut: 7,
  lastManStands: false,

  oneTipOneHand: {
    enabled: false,
    maxBounces: 1,
    maxHandsAllowed: 1,
    canTouchWallBeforeCatch: false,
    bowlerCredited: true,
    dismissalLabel: 'One Tip One Hand',
  },
  mankad: {
    enabled: true,
    bowlerCredited: false,
    allowWarningFirst: false,
  },
  hitWicket: {
    enabled: true,
    bowlerCredited: true,
    freeHitExemption: true,
  },
  wallRules: {
    enabled: false,
    directHitOutcome: 'four_runs',
    tapOutcome: 'no_effect',
    carOrWindowDirectHitOut: false,
    canCatchOffWall: false,
  },
  paceCall: {
    enabled: false,
    status: 'PENDING_SPECIFICATION',
  },
  deadBall: {
    allowManualDeclaration: true,
    defaultRepeatDelivery: true,
    awardPenaltyRuns: false,
    penaltyRunsAmount: 0,
  },

  lbwEnabled: false,
  wideReBowl: true,
  wideRunsAwarded: 1,
  noBallReBowl: true,
  noBallRunsAwarded: 1,
  noBallFreeHit: true, // Free hit on front-foot no-ball
  byesEnabled: true,
  legByesEnabled: true,
  overthrowsEnabled: true,
  superOverOvers: 1,
}

export const SOCIETY_CRICKET_PRESET: MatchRules = {
  id: 'preset_society',
  presetName: 'society_cricket',
  presetDisplayName: 'Society Cricket',
  version: 1,

  oversPerInnings: 5,
  ballsPerOver: 6,
  playersPerSide: 7,
  wicketsAllOut: 7,
  lastManStands: true,

  oneTipOneHand: {
    enabled: true,
    maxBounces: 1,
    maxHandsAllowed: 1,
    canTouchWallBeforeCatch: false,
    bowlerCredited: true,
    dismissalLabel: 'One Tip One Hand',
  },
  mankad: {
    enabled: true,
    bowlerCredited: false,
    allowWarningFirst: true,
  },
  hitWicket: {
    enabled: true,
    bowlerCredited: true,
    freeHitExemption: true,
  },
  wallRules: {
    enabled: true,
    directHitOutcome: 'out', // Direct hit to building/car is out
    tapOutcome: 'one_run',
    carOrWindowDirectHitOut: true,
    canCatchOffWall: false,
  },
  paceCall: {
    enabled: false,
    status: 'PENDING_SPECIFICATION',
  },
  deadBall: {
    allowManualDeclaration: true,
    defaultRepeatDelivery: true,
    awardPenaltyRuns: false,
    penaltyRunsAmount: 0,
  },

  lbwEnabled: false,
  wideReBowl: true,
  wideRunsAwarded: 1,
  noBallReBowl: true,
  noBallRunsAwarded: 1,
  noBallFreeHit: false,
  byesEnabled: true,
  legByesEnabled: false,
  overthrowsEnabled: false,
  superOverOvers: 1,
}

export const PRESET_CATALOGUE: Record<RulePresetType, MatchRules> = {
  standard_cricket: STANDARD_CRICKET_PRESET,
  gully_cricket: GULLY_CRICKET_PRESET,
  tennis_ball_cricket: TENNIS_BALL_CRICKET_PRESET,
  society_cricket: SOCIETY_CRICKET_PRESET,
  custom: {
    ...GULLY_CRICKET_PRESET,
    id: 'preset_custom',
    presetName: 'custom',
    presetDisplayName: 'Custom Rules',
  },
}

export function getPresetRules(preset: RulePresetType): MatchRules {
  return JSON.parse(JSON.stringify(PRESET_CATALOGUE[preset]))
}

export function listPresets(): { type: RulePresetType; name: string; description: string }[] {
  return [
    {
      type: 'gully_cricket',
      name: 'Gully Cricket',
      description: 'One tip one hand, wall runs, no LBW, last man standing, street-tested.',
    },
    {
      type: 'society_cricket',
      name: 'Society Cricket',
      description: 'Direct building/car hit is OUT, one tip one hand, quick 5-over matches.',
    },
    {
      type: 'tennis_ball_cricket',
      name: 'Tennis Ball Cricket',
      description: 'Turf & maidan tennis ball rules, free hits enabled, byes & leg-byes.',
    },
    {
      type: 'standard_cricket',
      name: 'Standard Cricket',
      description: 'Official MCC/ICC cricket laws, LBW enabled, no wall rules or 1-tip catches.',
    },
    {
      type: 'custom',
      name: 'Custom Rules',
      description: 'Fully configurable rules, balls per over, wall outcomes, and dismissals.',
    },
  ]
}
