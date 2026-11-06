import type { PlayerCareerStats, MilestoneBadge, MilestoneBadgeId } from './types'

export const BADGE_DEFINITIONS: Record<
  MilestoneBadgeId,
  { title: string; description: string; icon: string }
> = {
  first_match: {
    title: 'Debut',
    description: 'Played their first recorded match',
    icon: '🏏',
  },
  first_fifty: {
    title: 'Maiden Fifty',
    description: 'Scored their first half-century (50+ runs)',
    icon: '⚡',
  },
  first_century: {
    title: 'Century Club',
    description: 'Scored their first 100 in an innings',
    icon: '👑',
  },
  five_wicket_haul: {
    title: 'Fifer (5-Wkt Haul)',
    description: 'Took 5 or more wickets in a single innings',
    icon: '🔥',
  },
  hat_trick: {
    title: 'Hat-Trick Hero',
    description: 'Took 3 wickets on 3 consecutive deliveries',
    icon: '🎩',
  },
  century_runs: {
    title: '100 Career Runs',
    description: 'Surpassed 100 total career runs off the bat',
    icon: '💯',
  },
  century_wickets: {
    title: '100 Career Wickets',
    description: 'Surpassed 100 total career wickets',
    icon: '🎯',
  },
  golden_duck: {
    title: 'Golden Duck',
    description: 'Dismissed on the very first ball faced',
    icon: '🦆',
  },
  super_striker: {
    title: 'Super Striker',
    description: 'Maintained a career strike rate above 150 (min 50 balls)',
    icon: '🚀',
  },
  economical_spell: {
    title: 'Mr. Miser',
    description: 'Maintained a career economy rate below 6.00 (min 30 balls)',
    icon: '🔒',
  },
}

export function derivePlayerBadges(stats: PlayerCareerStats): MilestoneBadge[] {
  const badges: MilestoneBadge[] = []

  if (stats.matchesCount >= 1) {
    badges.push({ id: 'first_match', ...BADGE_DEFINITIONS.first_match })
  }
  if (stats.batting.fifties >= 1 || stats.batting.centuries >= 1) {
    badges.push({ id: 'first_fifty', ...BADGE_DEFINITIONS.first_fifty })
  }
  if (stats.batting.centuries >= 1) {
    badges.push({ id: 'first_century', ...BADGE_DEFINITIONS.first_century })
  }
  if (stats.bowling.fiveWickets >= 1) {
    badges.push({ id: 'five_wicket_haul', ...BADGE_DEFINITIONS.five_wicket_haul })
  }
  if (stats.bowling.hatTricks >= 1) {
    badges.push({ id: 'hat_trick', ...BADGE_DEFINITIONS.hat_trick })
  }
  if (stats.batting.runs >= 100) {
    badges.push({ id: 'century_runs', ...BADGE_DEFINITIONS.century_runs })
  }
  if (stats.bowling.wickets >= 100) {
    badges.push({ id: 'century_wickets', ...BADGE_DEFINITIONS.century_wickets })
  }
  if (stats.batting.goldenDucks >= 1) {
    badges.push({ id: 'golden_duck', ...BADGE_DEFINITIONS.golden_duck })
  }
  if (stats.batting.ballsFaced >= 50 && stats.batting.strikeRate >= 150) {
    badges.push({ id: 'super_striker', ...BADGE_DEFINITIONS.super_striker })
  }
  if (stats.bowling.ballsBowled >= 30 && stats.bowling.economy < 6.0) {
    badges.push({ id: 'economical_spell', ...BADGE_DEFINITIONS.economical_spell })
  }

  return badges
}

export function detectNewlyAchievedMilestones(
  preMatch: PlayerCareerStats,
  postMatch: PlayerCareerStats,
  matchId: string,
): MilestoneBadge[] {
  const preBadges = new Set(derivePlayerBadges(preMatch).map((b) => b.id))
  const postBadges = derivePlayerBadges(postMatch)

  return postBadges
    .filter((b) => !preBadges.has(b.id))
    .map((b) => ({ ...b, achievedAtMatchId: matchId }))
}
