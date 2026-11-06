/**
 * PitchLog Pure Rules Validator
 * Pure functional evaluations for custom gully and standard cricket rules.
 */

import type {
  MatchRules,
  OneTipOneHandRule,
  MankadRule,
  HitWicketRule,
  WallRulesConfig,
  DeadBallRule,
} from './types'

export interface OneTipValidationResult {
  isValid: boolean
  bowlerCredited: boolean
  reason?: string
}

/**
 * Validates whether a catch satisfies the active One Tip One Hand rules.
 */
export function validateOneTipCatch(
  bounces: number,
  handsUsed: number,
  touchedWall: boolean,
  rule: OneTipOneHandRule,
): OneTipValidationResult {
  if (!rule.enabled) {
    return {
      isValid: false,
      bowlerCredited: false,
      reason: 'One Tip One Hand rule is not enabled for this match',
    }
  }

  if (bounces <= 0) {
    // 0 bounces is a direct catch on the full (standard catch)
    return {
      isValid: true,
      bowlerCredited: true,
    }
  }

  if (bounces > rule.maxBounces) {
    return {
      isValid: false,
      bowlerCredited: false,
      reason: `Ball bounced ${bounces} times (max allowed: ${rule.maxBounces})`,
    }
  }

  if (handsUsed > rule.maxHandsAllowed) {
    return {
      isValid: false,
      bowlerCredited: false,
      reason: `Catch must be made with ${rule.maxHandsAllowed} hand(s), but ${handsUsed} hands were used`,
    }
  }

  if (touchedWall && !rule.canTouchWallBeforeCatch) {
    return {
      isValid: false,
      bowlerCredited: false,
      reason: 'Ball touched boundary wall before catch; invalid under ground rules',
    }
  }

  return {
    isValid: true,
    bowlerCredited: rule.bowlerCredited,
  }
}

export interface MankadValidationResult {
  isValid: boolean
  bowlerCredited: boolean
  dismissedPlayerId: string
  reason?: string
}

/**
 * Validates a Mankad (run out of non-striker before delivery).
 */
export function validateMankadDismissal(
  dismissedPlayerId: string,
  nonStrikerId: string,
  rule: MankadRule,
): MankadValidationResult {
  if (!rule.enabled) {
    return {
      isValid: false,
      bowlerCredited: false,
      dismissedPlayerId,
      reason: 'Mankad dismissals are disabled in this match configuration',
    }
  }

  if (dismissedPlayerId !== nonStrikerId) {
    return {
      isValid: false,
      bowlerCredited: false,
      dismissedPlayerId,
      reason: 'Mankad can only dismiss the active non-striker',
    }
  }

  return {
    isValid: true,
    bowlerCredited: false, // Per MCC Law 38, never credited to bowler
    dismissedPlayerId,
  }
}

export interface HitWicketValidationResult {
  isValid: boolean
  bowlerCredited: boolean
  reason?: string
}

/**
 * Validates a Hit-Wicket dismissal, respecting Free Hit immunity.
 */
export function validateHitWicket(
  isFreeHit: boolean,
  rule: HitWicketRule,
): HitWicketValidationResult {
  if (!rule.enabled) {
    return {
      isValid: false,
      bowlerCredited: false,
      reason: 'Hit Wicket rule is disabled in this match configuration',
    }
  }

  if (isFreeHit && rule.freeHitExemption) {
    return {
      isValid: false,
      bowlerCredited: false,
      reason: 'Batter cannot be out Hit Wicket off a Free Hit delivery',
    }
  }

  return {
    isValid: true,
    bowlerCredited: rule.bowlerCredited,
  }
}

export interface WallContactResult {
  runs: number
  isOut: boolean
  isDeadBall: boolean
  isBoundary: boolean
  dismissalReason?: string
}

/**
 * Evaluates the outcome of a ball contacting a ground wall or physical hazard.
 */
export function evaluateWallContact(
  contactType: 'direct_hit' | 'ground_tap' | 'car_or_window',
  wallRules: WallRulesConfig,
): WallContactResult {
  if (!wallRules.enabled) {
    return {
      runs: 0,
      isOut: false,
      isDeadBall: false,
      isBoundary: false,
    }
  }

  if (contactType === 'car_or_window') {
    if (wallRules.carOrWindowDirectHitOut) {
      return {
        runs: 0,
        isOut: true,
        isDeadBall: false,
        isBoundary: false,
        dismissalReason: 'Direct hit to car or window (Broken glass rule)',
      }
    }
    return {
      runs: 0,
      isOut: false,
      isDeadBall: true,
      isBoundary: false,
    }
  }

  if (contactType === 'direct_hit') {
    switch (wallRules.directHitOutcome) {
      case 'four_runs':
        return { runs: 4, isOut: false, isDeadBall: false, isBoundary: true }
      case 'six_runs':
        return { runs: 6, isOut: false, isDeadBall: false, isBoundary: true }
      case 'out':
        return {
          runs: 0,
          isOut: true,
          isDeadBall: false,
          isBoundary: false,
          dismissalReason: 'Direct hit to boundary wall is OUT under local rules',
        }
      case 'dead_ball':
        return { runs: 0, isOut: false, isDeadBall: true, isBoundary: false }
      case 'custom_runs':
        return {
          runs: wallRules.directHitCustomRuns ?? 4,
          isOut: false,
          isDeadBall: false,
          isBoundary: (wallRules.directHitCustomRuns ?? 4) >= 4,
        }
    }
  }

  // Ground tap
  switch (wallRules.tapOutcome) {
    case 'one_run':
      return { runs: 1, isOut: false, isDeadBall: false, isBoundary: false }
    case 'boundary_four':
      return { runs: 4, isOut: false, isDeadBall: false, isBoundary: true }
    case 'dead_ball':
      return { runs: 0, isOut: false, isDeadBall: true, isBoundary: false }
    case 'no_effect':
      return { runs: 0, isOut: false, isDeadBall: false, isBoundary: false }
  }
}

export interface DeadBallEvaluationResult {
  isLegalDelivery: boolean
  penaltyRuns: number
  mustReplay: boolean
}

/**
 * Evaluates Dead Ball resolution under active match rules.
 */
export function evaluateDeadBall(
  rule: DeadBallRule,
  customRuns = 0,
): DeadBallEvaluationResult {
  return {
    isLegalDelivery: false,
    penaltyRuns: rule.awardPenaltyRuns ? rule.penaltyRunsAmount : customRuns,
    mustReplay: rule.defaultRepeatDelivery,
  }
}

export interface ReballResolution {
  shouldVoidPriorRuns: boolean
  incrementsLegalBalls: false
}

/**
 * Confirms Reball operational constraints: never increments legal balls.
 */
export function evaluateReball(): ReballResolution {
  return {
    shouldVoidPriorRuns: true,
    incrementsLegalBalls: false,
  }
}

/**
 * Checks whether a bowler is permitted to bowl the next over under consecutive over rules.
 */
export function canBowlerBowlNextOver(
  bowlerId: string,
  previousBowlerId: string | null,
  bowlerOvers: number,
  maxOversPerBowler?: number,
): { allowed: boolean; reason?: string } {
  if (previousBowlerId && bowlerId === previousBowlerId) {
    return {
      allowed: false,
      reason: 'A bowler cannot bowl two consecutive overs from the same or alternating ends',
    }
  }

  if (maxOversPerBowler !== undefined && bowlerOvers >= maxOversPerBowler) {
    return {
      allowed: false,
      reason: `Bowler has completed their quota of ${maxOversPerBowler} overs`,
    }
  }

  return { allowed: true }
}

/**
 * Evaluates the active all-out condition based on squad size and LMS rule.
 */
export function isAllOut(
  wickets: number,
  rules: MatchRules,
): boolean {
  if (rules.lastManStands) {
    return wickets >= rules.playersPerSide
  }
  const standardWickets = Math.max(1, rules.playersPerSide - 1)
  return wickets >= standardWickets
}
