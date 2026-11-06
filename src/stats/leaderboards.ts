import type { PlayerCareerStats } from './types'

export interface LeaderboardQualifiers {
  minInningsForAverage: number
  minBallsForStrikeRate: number
  minBallsForEconomy: number
}

export const LEADERBOARD_QUALIFIERS: LeaderboardQualifiers = {
  minInningsForAverage: 3,
  minBallsForStrikeRate: 30,
  minBallsForEconomy: 36, // 6 overs
}

export type LeaderboardCategory =
  | 'runs'
  | 'average'
  | 'strike_rate'
  | 'sixes'
  | 'wickets'
  | 'economy'
  | 'catches'
  | 'mvp'

export interface RankedPlayerRow {
  rank: number
  playerId: string
  playerName: string
  primaryStat: string | number
  secondaryStat: string
}

export function rankLeaderboard(
  careers: PlayerCareerStats[],
  category: LeaderboardCategory,
  qualifiers: LeaderboardQualifiers = LEADERBOARD_QUALIFIERS,
): RankedPlayerRow[] {
  let filtered = [...careers]

  switch (category) {
    case 'runs':
      filtered.sort((a, b) => b.batting.runs - a.batting.runs)
      return filtered.slice(0, 25).map((c, i) => ({
        rank: i + 1,
        playerId: c.player.id,
        playerName: c.player.name,
        primaryStat: c.batting.runs,
        secondaryStat: `${c.batting.innings} inn • SR ${c.batting.strikeRate}`,
      }))

    case 'average':
      filtered = filtered.filter(
        (c) =>
          c.batting.innings >= qualifiers.minInningsForAverage &&
          c.batting.average !== null,
      )
      filtered.sort((a, b) => (b.batting.average ?? 0) - (a.batting.average ?? 0))
      return filtered.slice(0, 25).map((c, i) => ({
        rank: i + 1,
        playerId: c.player.id,
        playerName: c.player.name,
        primaryStat: c.batting.average ?? 0,
        secondaryStat: `${c.batting.runs} runs in ${c.batting.innings} inn`,
      }))

    case 'strike_rate':
      filtered = filtered.filter(
        (c) => c.batting.ballsFaced >= qualifiers.minBallsForStrikeRate,
      )
      filtered.sort((a, b) => b.batting.strikeRate - a.batting.strikeRate)
      return filtered.slice(0, 25).map((c, i) => ({
        rank: i + 1,
        playerId: c.player.id,
        playerName: c.player.name,
        primaryStat: c.batting.strikeRate,
        secondaryStat: `${c.batting.runs} runs off ${c.batting.ballsFaced} balls`,
      }))

    case 'sixes':
      filtered.sort((a, b) => b.batting.sixes - a.batting.sixes)
      return filtered.slice(0, 25).map((c, i) => ({
        rank: i + 1,
        playerId: c.player.id,
        playerName: c.player.name,
        primaryStat: c.batting.sixes,
        secondaryStat: `${c.batting.fours} fours • ${c.batting.runs} runs`,
      }))

    case 'wickets':
      filtered.sort((a, b) => b.bowling.wickets - a.bowling.wickets)
      return filtered.slice(0, 25).map((c, i) => ({
        rank: i + 1,
        playerId: c.player.id,
        playerName: c.player.name,
        primaryStat: c.bowling.wickets,
        secondaryStat: `Econ ${c.bowling.economy} • BBI ${c.bowling.bestFiguresDisplay}`,
      }))

    case 'economy':
      filtered = filtered.filter(
        (c) => c.bowling.ballsBowled >= qualifiers.minBallsForEconomy,
      )
      filtered.sort((a, b) => a.bowling.economy - b.bowling.economy)
      return filtered.slice(0, 25).map((c, i) => ({
        rank: i + 1,
        playerId: c.player.id,
        playerName: c.player.name,
        primaryStat: c.bowling.economy,
        secondaryStat: `${c.bowling.overs} ov • ${c.bowling.wickets} wkts`,
      }))

    case 'catches':
      filtered.sort((a, b) => b.fielding.catches - a.fielding.catches)
      return filtered.slice(0, 25).map((c, i) => ({
        rank: i + 1,
        playerId: c.player.id,
        playerName: c.player.name,
        primaryStat: c.fielding.catches,
        secondaryStat: `${c.fielding.totalDismissals} total fielding outs`,
      }))

    case 'mvp':
    default:
      filtered.sort((a, b) => b.mvpPoints - a.mvpPoints)
      return filtered.slice(0, 25).map((c, i) => ({
        rank: i + 1,
        playerId: c.player.id,
        playerName: c.player.name,
        primaryStat: c.mvpPoints,
        secondaryStat: `${c.batting.runs} runs • ${c.bowling.wickets} wkts`,
      }))
  }
}
