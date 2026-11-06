import type { MatchConfig, BallEvent } from '../engine/types'
import { deriveInnings } from '../engine/innings'
import type {
  Fixture,
  TournamentResult,
  TournamentInningsSummary,
} from './types'

export function isTeamAllOut(
  wickets: number,
  config: Pick<MatchConfig, 'playersPerSide' | 'lastManStands'>,
): boolean {
  const maxWickets = config.lastManStands
    ? config.playersPerSide
    : Math.max(1, config.playersPerSide - 1)
  return wickets >= maxWickets
}

export function deriveTournamentResult(
  fixture: Fixture,
  config: MatchConfig,
  events: BallEvent[],
  team1Id: string, // Innings 1 batting team
  team2Id: string, // Innings 2 batting team
): TournamentResult {
  const fixtureId = fixture.id
  const matchId = fixture.matchId ?? `m-${fixture.id}`

  // 1. Check for manual result override
  const override = fixture.resultOverride
  if (override) {
    if (override.type === 'walkover') {
      const winner = override.winnerTeamId ?? fixture.homeTeamId ?? team1Id
      const loser = winner === team1Id ? team2Id : team1Id
      return {
        fixtureId,
        matchId,
        winnerTeamId: winner,
        isTie: false,
        isNoResult: false,
        isSuperOver: false,
        marginText: 'Match awarded by walkover',
        innings1: {
          teamId: winner,
          runs: 0,
          wickets: 0,
          legalBalls: 0,
          oversString: '0.0',
          isAllOut: false,
          allocatedQuotaBalls: config.oversPerInnings * 6,
        },
        innings2: {
          teamId: loser,
          runs: 0,
          wickets: 0,
          legalBalls: 0,
          oversString: '0.0',
          isAllOut: false,
          allocatedQuotaBalls: config.oversPerInnings * 6,
        },
      }
    }

    if (override.type === 'abandoned' || override.type === 'no_result') {
      return {
        fixtureId,
        matchId,
        winnerTeamId: null,
        isTie: false,
        isNoResult: true,
        isSuperOver: false,
        marginText: override.note ? `Match Abandoned (${override.note})` : 'Match Abandoned (No Result)',
        innings1: {
          teamId: team1Id,
          runs: 0,
          wickets: 0,
          legalBalls: 0,
          oversString: '0.0',
          isAllOut: false,
          allocatedQuotaBalls: config.oversPerInnings * 6,
        },
        innings2: {
          teamId: team2Id,
          runs: 0,
          wickets: 0,
          legalBalls: 0,
          oversString: '0.0',
          isAllOut: false,
          allocatedQuotaBalls: config.oversPerInnings * 6,
        },
      }
    }
  }

  // 2. Separate events by innings
  const inn1Events = events.filter((e) => e.inningsNo === 1)
  const inn2Events = events.filter((e) => e.inningsNo === 2)
  const superOverInn3Events = events.filter((e) => e.inningsNo === 3)
  const superOverInn4Events = events.filter((e) => e.inningsNo === 4)

  const quotaBalls1 = config.oversPerInnings * 6
  let quotaBalls2 = config.oversPerInnings * 6
  let target: number | null = null

  const inn1 = deriveInnings(config, inn1Events)

  if (override?.type === 'revised_target') {
    target = override.revisedTarget ?? inn1.totalRuns + 1
    quotaBalls2 = override.revisedQuotaBalls ?? (override.revisedOvers ? override.revisedOvers * 6 : quotaBalls1)
  } else {
    target = inn1.totalRuns + 1
  }

  const inn2 = deriveInnings(config, inn2Events, { target })

  const isAllOut1 = isTeamAllOut(inn1.wickets, config)
  const isAllOut2 = isTeamAllOut(inn2.wickets, config)

  const summary1: TournamentInningsSummary = {
    teamId: team1Id,
    runs: inn1.totalRuns,
    wickets: inn1.wickets,
    legalBalls: inn1.legalBalls,
    oversString: inn1.overs,
    isAllOut: isAllOut1,
    allocatedQuotaBalls: quotaBalls1,
  }

  const summary2: TournamentInningsSummary = {
    teamId: team2Id,
    runs: inn2.totalRuns,
    wickets: inn2.wickets,
    legalBalls: inn2.legalBalls,
    oversString: inn2.overs,
    isAllOut: isAllOut2,
    allocatedQuotaBalls: quotaBalls2,
  }

  // Check manual tie decision override
  if (override?.type === 'tie_decided_manually') {
    return {
      fixtureId,
      matchId,
      winnerTeamId: override.winnerTeamId ?? null,
      isTie: true,
      isNoResult: false,
      isSuperOver: false,
      marginText: override.note ? `Tie - Decided Manually (${override.note})` : 'Tie - Decided Manually',
      innings1: summary1,
      innings2: summary2,
    }
  }

  // Check abandoned mid-innings (neither team reached target, inn2 incomplete without full quota or all-out)
  if (!inn1.isComplete && inn2Events.length === 0 && events.length > 0 && fixture.status === 'abandoned') {
    return {
      fixtureId,
      matchId,
      winnerTeamId: null,
      isTie: false,
      isNoResult: true,
      isSuperOver: false,
      marginText: 'Match Abandoned mid-innings',
      innings1: summary1,
      innings2: summary2,
    }
  }

  let winnerTeamId: string | null = null
  let isTie = false
  let isSuperOver = false
  let superOverWinnerId: string | null = null
  let marginText = ''

  const maxWickets = config.lastManStands
    ? config.playersPerSide
    : Math.max(1, config.playersPerSide - 1)

  if (target !== null && inn2.totalRuns >= target) {
    // Chasing team won
    winnerTeamId = team2Id
    const wicketsInHand = Math.max(0, maxWickets - inn2.wickets)
    const ballsRemaining = Math.max(0, quotaBalls2 - inn2.legalBalls)
    marginText = `Won by ${wicketsInHand} wicket${wicketsInHand === 1 ? '' : 's'} (with ${ballsRemaining} ball${ballsRemaining === 1 ? '' : 's'} remaining)`
  } else if (inn2.isComplete && inn2.totalRuns < (target ? target - 1 : inn1.totalRuns)) {
    // Defending team won
    winnerTeamId = team1Id
    const runMargin = (target ? target - 1 : inn1.totalRuns) - inn2.totalRuns
    marginText = `Won by ${runMargin} run${runMargin === 1 ? '' : 's'}`
  } else if (inn2.isComplete && inn2.totalRuns === (target ? target - 1 : inn1.totalRuns)) {
    // Scores level -> Tie
    isTie = true
    if (superOverInn3Events.length > 0 && superOverInn4Events.length > 0) {
      isSuperOver = true
      const soConfig: MatchConfig = {
        ...config,
        oversPerInnings: config.superOverOvers ?? 1,
        playersPerSide: 3,
      }
      const so1 = deriveInnings(soConfig, superOverInn3Events)
      const so2 = deriveInnings(soConfig, superOverInn4Events, { target: so1.totalRuns + 1 })
      if (so2.totalRuns > so1.totalRuns) {
        superOverWinnerId = team2Id
        winnerTeamId = team2Id
        marginText = 'Match tied (Won Super Over)'
      } else if (so1.totalRuns > so2.totalRuns) {
        superOverWinnerId = team1Id
        winnerTeamId = team1Id
        marginText = 'Match tied (Won Super Over)'
      } else {
        winnerTeamId = null
        marginText = 'Match tied (Super Over tied)'
      }
    } else {
      winnerTeamId = null
      marginText = 'Match tied'
    }
  } else {
    // In progress or incomplete
    marginText = 'Match in progress'
  }

  return {
    fixtureId,
    matchId,
    winnerTeamId,
    isTie,
    isNoResult: false,
    isSuperOver,
    superOverWinnerId,
    marginText,
    innings1: summary1,
    innings2: summary2,
    revisedTarget: override?.revisedTarget,
    revisedQuotaBalls: override?.revisedQuotaBalls,
  }
}
