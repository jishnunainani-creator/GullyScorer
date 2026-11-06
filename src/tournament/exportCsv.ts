import type { TeamStandingsRow, Fixture } from './types'

export function exportStandingsToCsv(
  standings: TeamStandingsRow[],
  tournamentName: string,
): string {
  const headers = [
    'Rank',
    'Team',
    'Group',
    'Played',
    'Won',
    'Lost',
    'Tied',
    'No Result',
    'Points',
    'NRR',
    'Runs For',
    'Overs For',
    'Runs Against',
    'Overs Against',
  ]

  const rows = standings.map((s, idx) => [
    idx + 1,
    `"${s.teamName.replace(/"/g, '""')}"`,
    s.groupId ? `"${s.groupId}"` : '""',
    s.played,
    s.won,
    s.lost,
    s.tied,
    s.noResult,
    s.points,
    s.nrrText,
    s.runsFor,
    s.oversForString,
    s.runsAgainst,
    s.oversAgainstString,
  ])

  const headerLine = `# Tournament: ${tournamentName}`
  const csvContent = [headerLine, headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  return csvContent
}

export function exportFixturesToCsv(
  fixtures: Fixture[],
  teamsById: Record<string, string>,
  tournamentName: string,
): string {
  const headers = [
    'Match No',
    'Round',
    'Stage',
    'Group',
    'Home Team',
    'Away Team',
    'Status',
    'Scheduled Time',
    'Result Summary',
  ]

  const rows = fixtures.map((f, idx) => {
    const homeName = f.homeTeamId ? teamsById[f.homeTeamId] ?? f.homeTeamId : 'TBD'
    const awayName = f.awayTeamId ? teamsById[f.awayTeamId] ?? f.awayTeamId : 'TBD'
    const scheduled = f.scheduledAt ? new Date(f.scheduledAt).toISOString() : 'TBD'
    const roundName =
      f.stage === 'league' || f.stage === 'group'
        ? `Round ${f.round}`
        : f.stage.replace('_', ' ').toUpperCase()
    const summary = f.resultOverride?.note ?? (f.status === 'completed' ? 'Completed' : f.status)

    return [
      idx + 1,
      `"${roundName}"`,
      f.stage,
      f.groupId ? `"${f.groupId}"` : '""',
      `"${homeName.replace(/"/g, '""')}"`,
      `"${awayName.replace(/"/g, '""')}"`,
      f.status,
      `"${scheduled}"`,
      `"${summary.replace(/"/g, '""')}"`,
    ]
  })

  const headerLine = `# Tournament: ${tournamentName}`
  const csvContent = [headerLine, headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  return csvContent
}
