import { describe, it, expect } from 'vitest'
import {
  validateOneTipCatch,
  validateMankadDismissal,
  validateHitWicket,
  evaluateWallContact,
  evaluateDeadBall,
  evaluateReball,
  canBowlerBowlNextOver,
  isAllOut,
} from '../validator'
import {
  STANDARD_CRICKET_PRESET,
  GULLY_CRICKET_PRESET,
  SOCIETY_CRICKET_PRESET,
  getPresetRules,
  listPresets,
} from '../presets'

describe('Rules Engine: One Tip One Hand Validator', () => {
  const gullyRule = GULLY_CRICKET_PRESET.oneTipOneHand

  it('allows clean catch on the full (0 bounces)', () => {
    const res = validateOneTipCatch(0, 1, false, gullyRule)
    expect(res.isValid).toBe(true)
    expect(res.bowlerCredited).toBe(true)
  })

  it('allows 1-tip 1-hand catch when enabled', () => {
    const res = validateOneTipCatch(1, 1, false, gullyRule)
    expect(res.isValid).toBe(true)
    expect(res.bowlerCredited).toBe(true)
  })

  it('rejects catch if ball bounces more than maxBounces (e.g. 2 bounces)', () => {
    const res = validateOneTipCatch(2, 1, false, gullyRule)
    expect(res.isValid).toBe(false)
    expect(res.reason).toContain('Ball bounced 2 times')
  })

  it('rejects catch if fielder uses two hands', () => {
    const res = validateOneTipCatch(1, 2, false, gullyRule)
    expect(res.isValid).toBe(false)
    expect(res.reason).toContain('Catch must be made with 1 hand')
  })

  it('rejects catch if ball touched boundary wall and wall touch is not allowed', () => {
    const res = validateOneTipCatch(1, 1, true, { ...gullyRule, canTouchWallBeforeCatch: false })
    expect(res.isValid).toBe(false)
    expect(res.reason).toContain('touched boundary wall')
  })

  it('allows catch off wall touch if rule specifically permits it', () => {
    const res = validateOneTipCatch(1, 1, true, { ...gullyRule, canTouchWallBeforeCatch: true })
    expect(res.isValid).toBe(true)
  })

  it('rejects 1-tip catch when rule is disabled (e.g. standard cricket)', () => {
    const res = validateOneTipCatch(1, 1, false, STANDARD_CRICKET_PRESET.oneTipOneHand)
    expect(res.isValid).toBe(false)
    expect(res.reason).toContain('not enabled')
  })
})

describe('Rules Engine: Mankad Validator', () => {
  const mankadRule = GULLY_CRICKET_PRESET.mankad

  it('validates Mankad when non-striker is dismissed', () => {
    const res = validateMankadDismissal('p-non-striker', 'p-non-striker', mankadRule)
    expect(res.isValid).toBe(true)
    expect(res.bowlerCredited).toBe(false) // Never credited to bowler
    expect(res.dismissedPlayerId).toBe('p-non-striker')
  })

  it('rejects Mankad if player is not the non-striker', () => {
    const res = validateMankadDismissal('p-striker', 'p-non-striker', mankadRule)
    expect(res.isValid).toBe(false)
    expect(res.reason).toContain('only dismiss the active non-striker')
  })

  it('rejects Mankad when disabled', () => {
    const res = validateMankadDismissal('p2', 'p2', { ...mankadRule, enabled: false })
    expect(res.isValid).toBe(false)
  })
})

describe('Rules Engine: Hit Wicket Validator', () => {
  const hitWicketRule = GULLY_CRICKET_PRESET.hitWicket

  it('allows hit wicket on normal delivery and credits bowler', () => {
    const res = validateHitWicket(false, hitWicketRule)
    expect(res.isValid).toBe(true)
    expect(res.bowlerCredited).toBe(true)
  })

  it('exempts hit wicket on a Free Hit delivery', () => {
    const res = validateHitWicket(true, hitWicketRule)
    expect(res.isValid).toBe(false)
    expect(res.reason).toContain('cannot be out Hit Wicket off a Free Hit')
  })
})

describe('Rules Engine: Wall & Hazard Contact Evaluator', () => {
  it('awards 4 runs on direct wall hit in gully preset', () => {
    const res = evaluateWallContact('direct_hit', GULLY_CRICKET_PRESET.wallRules)
    expect(res.runs).toBe(4)
    expect(res.isOut).toBe(false)
    expect(res.isBoundary).toBe(true)
  })

  it('awards 1 run on ground wall tap in gully preset', () => {
    const res = evaluateWallContact('ground_tap', GULLY_CRICKET_PRESET.wallRules)
    expect(res.runs).toBe(1)
    expect(res.isOut).toBe(false)
  })

  it('rules OUT on direct window or car hit (broken glass rule)', () => {
    const res = evaluateWallContact('car_or_window', GULLY_CRICKET_PRESET.wallRules)
    expect(res.isOut).toBe(true)
    expect(res.runs).toBe(0)
    expect(res.dismissalReason).toContain('Broken glass rule')
  })

  it('rules OUT on direct wall hit in society cricket preset', () => {
    const res = evaluateWallContact('direct_hit', SOCIETY_CRICKET_PRESET.wallRules)
    expect(res.isOut).toBe(true)
    expect(res.runs).toBe(0)
  })

  it('does nothing if wall rules are disabled', () => {
    const res = evaluateWallContact('direct_hit', STANDARD_CRICKET_PRESET.wallRules)
    expect(res.runs).toBe(0)
    expect(res.isOut).toBe(false)
  })
})

describe('Rules Engine: Dead Ball and Reball Invariants', () => {
  it('evaluates dead ball without legal delivery increment', () => {
    const res = evaluateDeadBall(GULLY_CRICKET_PRESET.deadBall)
    expect(res.isLegalDelivery).toBe(false)
    expect(res.mustReplay).toBe(true)
  })

  it('guarantees reball never increments legal delivery count', () => {
    const res = evaluateReball()
    expect(res.incrementsLegalBalls).toBe(false)
    expect(res.shouldVoidPriorRuns).toBe(true)
  })
})

describe('Rules Engine: Bowler Quota and All-Out Evaluator', () => {
  it('blocks consecutive overs by the same bowler', () => {
    const check = canBowlerBowlNextOver('bowler-1', 'bowler-1', 1)
    expect(check.allowed).toBe(false)
    expect(check.reason).toContain('two consecutive overs')
  })

  it('allows different bowler to bowl next over', () => {
    const check = canBowlerBowlNextOver('bowler-2', 'bowler-1', 0)
    expect(check.allowed).toBe(true)
  })

  it('blocks bowler exceeding maximum quota', () => {
    const check = canBowlerBowlNextOver('bowler-2', 'bowler-1', 4, 4)
    expect(check.allowed).toBe(false)
    expect(check.reason).toContain('completed their quota of 4 overs')
  })

  it('evaluates all out under Last Man Stands rule', () => {
    // 6-player side: LMS requires 6 wickets for all-out
    expect(isAllOut(5, GULLY_CRICKET_PRESET)).toBe(false)
    expect(isAllOut(6, GULLY_CRICKET_PRESET)).toBe(true)
  })

  it('evaluates all out under standard rules (N-1 wickets)', () => {
    // 11-player side: Standard requires 10 wickets for all-out
    expect(isAllOut(9, STANDARD_CRICKET_PRESET)).toBe(false)
    expect(isAllOut(10, STANDARD_CRICKET_PRESET)).toBe(true)
  })
})

describe('Rules Presets Catalogue', () => {
  it('lists 5 valid presets with descriptions', () => {
    const presets = listPresets()
    expect(presets).toHaveLength(5)
    expect(presets.map((p) => p.type)).toEqual([
      'gully_cricket',
      'society_cricket',
      'tennis_ball_cricket',
      'standard_cricket',
      'custom',
    ])
  })

  it('clones preset cleanly without shared references', () => {
    const p1 = getPresetRules('gully_cricket')
    const p2 = getPresetRules('gully_cricket')
    p1.oversPerInnings = 15
    expect(p2.oversPerInnings).toBe(6)
  })
})
