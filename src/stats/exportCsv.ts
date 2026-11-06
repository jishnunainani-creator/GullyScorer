import type { BallEvent } from '../engine/types'
import type { MatchRecord } from '../db/schema'
import { deriveInningsBatting } from './batting'
import { deriveInningsBowling } from './bowling'
import type { PlayerCareerStats } from './types'

export function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function generateCareerBattingCsv(careers: PlayerCareerStats[]): string {
  const headers = [
    'Player Name',
    'Role',
    'Matches',
    'Innings',
    'Not Outs',
    'Runs',
    'Balls Faced',
    'Highest Score',
    'Average',
    'Strike Rate',
    '4s',
    '6s',
    '50s',
    '100s',
    'Ducks',
    'Dot Ball %',
    'Boundary %',
  ]

  const rows = careers.map((c) => [
    escapeCsvField(c.player.name),
    escapeCsvField(c.role),
    escapeCsvField(c.matchesCount),
    escapeCsvField(c.batting.innings),
    escapeCsvField(c.batting.notOuts),
    escapeCsvField(c.batting.runs),
    escapeCsvField(c.batting.ballsFaced),
    escapeCsvField(
      `${c.batting.highestScore}${c.batting.highestScoreNotOut ? '*' : ''}`,
    ),
    escapeCsvField(c.batting.average ?? '-'),
    escapeCsvField(c.batting.strikeRate),
    escapeCsvField(c.batting.fours),
    escapeCsvField(c.batting.sixes),
    escapeCsvField(c.batting.fifties),
    escapeCsvField(c.batting.centuries),
    escapeCsvField(c.batting.ducks),
    escapeCsvField(`${c.batting.dotBallPercentage}%`),
    escapeCsvField(`${c.batting.boundaryPercentage}%`),
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

export function generateCareerBowlingCsv(careers: PlayerCareerStats[]): string {
  const headers = [
    'Player Name',
    'Role',
    'Matches',
    'Innings',
    'Overs',
    'Maidens',
    'Runs Conceded',
    'Wickets',
    'Average',
    'Economy',
    'Strike Rate',
    'Best Figures',
    '3w Hauls',
    '5w Hauls',
    'Dot Ball %',
    'Hat-Tricks',
  ]

  const rows = careers.map((c) => [
    escapeCsvField(c.player.name),
    escapeCsvField(c.role),
    escapeCsvField(c.matchesCount),
    escapeCsvField(c.bowling.innings),
    escapeCsvField(c.bowling.overs),
    escapeCsvField(c.bowling.maidens),
    escapeCsvField(c.bowling.runsConceded),
    escapeCsvField(c.bowling.wickets),
    escapeCsvField(c.bowling.average ?? '-'),
    escapeCsvField(c.bowling.economy),
    escapeCsvField(c.bowling.strikeRate ?? '-'),
    escapeCsvField(c.bowling.bestFiguresDisplay),
    escapeCsvField(c.bowling.threeWickets),
    escapeCsvField(c.bowling.fiveWickets),
    escapeCsvField(`${c.bowling.dotBallPercentage}%`),
    escapeCsvField(c.bowling.hatTricks),
  ])

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}

export function generateMatchScorecardCsv(
  match: MatchRecord,
  events: BallEvent[],
  playerNames: Record<string, string>,
): string {
  const lines: string[] = []

  lines.push(`Match Date: ${match.date}`)
  lines.push(`Format: ${match.config.oversPerInnings} overs per innings`)
  lines.push('')

  for (const innNo of [1, 2]) {
    lines.push(`--- INNINGS ${innNo} BATTING ---`)
    lines.push('Batter,Runs,Balls,4s,6s,SR,Status')
    const batting = deriveInningsBatting(events, match.id, innNo)
    for (const b of Object.values(batting)) {
      const name = playerNames[b.playerId] ?? b.playerId
      const status = b.isOut ? (b.dismissalType ?? 'out') : 'not out'
      lines.push(
        [
          escapeCsvField(name),
          b.runs,
          b.ballsFaced,
          b.fours,
          b.sixes,
          b.strikeRate,
          escapeCsvField(status),
        ].join(','),
      )
    }
    lines.push('')

    lines.push(`--- INNINGS ${innNo} BOWLING ---`)
    lines.push('Bowler,Overs,Maidens,Runs,Wickets,Economy,Dots')
    const bowling = deriveInningsBowling(events, match.id, innNo, match.config)
    for (const bowl of Object.values(bowling)) {
      const name = playerNames[bowl.playerId] ?? bowl.playerId
      lines.push(
        [
          escapeCsvField(name),
          bowl.overs,
          bowl.maidens,
          bowl.runsConceded,
          bowl.wickets,
          bowl.economy,
          bowl.dotBalls,
        ].join(','),
      )
    }
    lines.push('')
  }

  return lines.join('\n')
}
