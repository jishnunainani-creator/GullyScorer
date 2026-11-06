import { useState, useEffect, useMemo, useCallback } from 'react'
import type {
  BallEvent,
  Innings,
  MatchConfig,
  Player,
  Team,
  ExtraInfo,
  WicketInfo,
  ShotZone,
  WallContactInfo,
} from '../engine/types'
import { deriveInnings } from '../engine/innings'
import { isLegalDelivery } from '../engine/delivery'
import { repository, MatchRepository } from '../db/repository'
import type { MatchRecord } from '../db/schema'
import { broadcastLiveBall, broadcastLiveUndo } from '../live/liveBroadcast'
import { advanceKnockoutWinner } from '../tournament/bracket'

export interface AddBallParams {
  runsOffBat: number
  extra?: ExtraInfo | null
  wicket?: WicketInfo | null
  isBoundary4?: boolean
  isBoundary6?: boolean
  batterId?: string
  nonStrikerId?: string
  bowlerId?: string
  wallContact?: WallContactInfo
}

export interface OverGroup {
  overNumber: number
  balls: BallEvent[]
  isCompleted: boolean
  runs: number
  wickets: number
}

export function groupEventsIntoOvers(
  events: BallEvent[],
  config: MatchConfig,
): OverGroup[] {
  const overs: OverGroup[] = []
  let currentBalls: BallEvent[] = []
  let legalBallsInCurrentOver = 0
  let overNumber = 1

  for (const b of events) {
    currentBalls.push(b)
    if (isLegalDelivery(b, config)) {
      legalBallsInCurrentOver++
      if (legalBallsInCurrentOver === 6) {
        overs.push({
          overNumber,
          balls: currentBalls,
          isCompleted: true,
          runs: currentBalls.reduce(
            (acc, ev) => acc + ev.runsOffBat + (ev.extra?.runs ?? 0),
            0,
          ),
          wickets: currentBalls.filter(
            (ev) => ev.wicket && ev.wicket.type !== 'retired',
          ).length,
        })
        currentBalls = []
        legalBallsInCurrentOver = 0
        overNumber++
      }
    }
  }

  if (currentBalls.length > 0) {
    overs.push({
      overNumber,
      balls: currentBalls,
      isCompleted: false,
      runs: currentBalls.reduce(
        (acc, ev) => acc + ev.runsOffBat + (ev.extra?.runs ?? 0),
        0,
      ),
      wickets: currentBalls.filter(
        (ev) => ev.wicket && ev.wicket.type !== 'retired',
      ).length,
    })
  }

  return overs
}

export interface UseMatchReturn {
  loading: boolean
  error: string | null
  match: MatchRecord | null
  config: MatchConfig | null
  teams: Record<string, Team>
  players: Record<string, Player>
  events: BallEvent[]
  currentInningsNo: number
  innings1: Innings | null
  innings2: Innings | null
  currentInnings: Innings | null
  battingTeam: Team | null
  bowlingTeam: Team | null
  striker: Player | null
  nonStriker: Player | null
  currentBowler: Player | null
  thisOverBalls: BallEvent[]
  groupedOvers: OverGroup[]
  matchResult: string | null
  isMatchComplete: boolean
  needsNewBowler: boolean
  needsNewBatter: boolean
  previousBowlerId: string | null
  addBall: (params: AddBallParams) => Promise<void>
  undo: () => Promise<void>
  startSecondInnings: (openers: {
    strikerId: string
    nonStrikerId: string
    bowlerId: string
  }) => Promise<void>
  setNewBowler: (bowlerId: string) => void
  setNewBatter: (batterId: string) => void
  recordShotForLastBall: (zone: ShotZone) => Promise<void>
  updateMatchLive: (isLive: boolean, shareToken?: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useMatch(
  matchId: string,
  repo: MatchRepository = repository,
): UseMatchReturn {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [match, setMatch] = useState<MatchRecord | null>(null)
  const [teams, setTeams] = useState<Record<string, Team>>({})
  const [players, setPlayers] = useState<Record<string, Player>>({})
  const [events, setEvents] = useState<BallEvent[]>([])

  // Local overrides when waiting for new bowler or new batter selection
  const [selectedBowlerId, setSelectedBowlerId] = useState<string | null>(null)
  const [selectedBatterId, setSelectedBatterId] = useState<string | null>(null)

  const loadMatchData = useCallback(async () => {
    if (!matchId) {
      setLoading(false)
      setMatch(null)
      setEvents([])
      setTeams({})
      setPlayers({})
      setError(null)
      return
    }
    try {
      setLoading(true)
      const matchRecord = await repo.getMatch(matchId)
      if (!matchRecord) {
        setError(`Match ${matchId} not found`)
        setLoading(false)
        return
      }
      setMatch(matchRecord)

      const teamsData = await repo.getTeams([
        matchRecord.teamAId,
        matchRecord.teamBId,
      ])
      const teamMap: Record<string, Team> = {}
      for (const t of teamsData) {
        teamMap[t.id] = t
      }
      setTeams(teamMap)

      const allPlayerIds = [
        ...(teamMap[matchRecord.teamAId]?.playerIds ?? []),
        ...(teamMap[matchRecord.teamBId]?.playerIds ?? []),
      ]
      const playersData = await repo.getPlayers(allPlayerIds)
      const playerMap: Record<string, Player> = {}
      for (const p of playersData) {
        playerMap[p.id] = p
      }
      setPlayers(playerMap)

      const balls = await repo.getBallEvents(matchId)
      setEvents(balls)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load match')
    } finally {
      setLoading(false)
    }
  }, [matchId, repo])

  useEffect(() => {
    void loadMatchData()
  }, [loadMatchData])

  const config = match?.config ?? null

  // Segregate events by innings
  const innings1Events = useMemo(
    () => events.filter((e) => e.inningsNo === 1),
    [events],
  )
  const innings2Events = useMemo(
    () => events.filter((e) => e.inningsNo === 2),
    [events],
  )

  // Derive innings 1
  const innings1 = useMemo(() => {
    if (!config || !match) return null
    return deriveInnings(config, innings1Events, {
      battingTeamId: match.innings1BattingTeamId,
      bowlingTeamId: match.innings1BowlingTeamId,
    })
  }, [config, match, innings1Events])

  // Derive innings 2
  const innings2 = useMemo(() => {
    if (!config || !match || !innings1) return null
    const target = innings1.totalRuns + 1
    return deriveInnings(config, innings2Events, {
      battingTeamId: match.innings2BattingTeamId,
      bowlingTeamId: match.innings2BowlingTeamId,
      target,
    })
  }, [config, match, innings1, innings2Events])

  // Current innings number based on match record and progress
  const currentInningsNo = match?.currentInningsNo ?? 1

  const currentInnings = useMemo(() => {
    return currentInningsNo === 1 ? innings1 : innings2
  }, [currentInningsNo, innings1, innings2])

  // Active teams
  const battingTeam = useMemo(() => {
    if (!match) return null
    const teamId =
      currentInningsNo === 1
        ? match.innings1BattingTeamId
        : match.innings2BattingTeamId
    return teams[teamId] ?? null
  }, [match, currentInningsNo, teams])

  const bowlingTeam = useMemo(() => {
    if (!match) return null
    const teamId =
      currentInningsNo === 1
        ? match.innings1BowlingTeamId
        : match.innings2BowlingTeamId
    return teams[teamId] ?? null
  }, [match, currentInningsNo, teams])

  // Active striker and non-striker
  const strikerId = useMemo(() => {
    if (selectedBatterId) return selectedBatterId
    const innEvents = currentInnings?.events ?? []
    if (innEvents.length === 0 && match) {
      const openers =
        currentInningsNo === 1 ? match.innings1Openers : match.innings2Openers
      return openers?.strikerId ?? null
    }
    return currentInnings?.currentStrikerId ?? null
  }, [selectedBatterId, currentInnings, match, currentInningsNo])

  const nonStrikerId = useMemo(() => {
    const innEvents = currentInnings?.events ?? []
    if (innEvents.length === 0 && match) {
      const openers =
        currentInningsNo === 1 ? match.innings1Openers : match.innings2Openers
      return openers?.nonStrikerId ?? null
    }
    return currentInnings?.currentNonStrikerId ?? null
  }, [currentInnings, match, currentInningsNo])

  // Active bowler
  const bowlerId = useMemo(() => {
    if (selectedBowlerId) return selectedBowlerId
    const innEvents = currentInnings?.events ?? []
    if (innEvents.length === 0 && match) {
      const openers =
        currentInningsNo === 1 ? match.innings1Openers : match.innings2Openers
      return openers?.bowlerId ?? null
    }
    return currentInnings?.currentBowlerId ?? null
  }, [selectedBowlerId, currentInnings, match, currentInningsNo])

  const striker = strikerId ? players[strikerId] ?? null : null
  const nonStriker = nonStrikerId ? players[nonStrikerId] ?? null : null
  const currentBowler = bowlerId ? players[bowlerId] ?? null : null

  // Detect end of over (new bowler required)
  const isOverComplete = useMemo(() => {
    if (!currentInnings || currentInnings.legalBalls === 0) return false
    return (
      currentInnings.legalBalls % 6 === 0 &&
      currentInnings.events.length > 0 &&
      !currentInnings.isComplete
    )
  }, [currentInnings])

  // Calculate previous over bowler
  const previousBowlerId = useMemo(() => {
    if (!currentInnings || currentInnings.events.length === 0) return null
    const lastBall = currentInnings.events[currentInnings.events.length - 1]
    return lastBall?.bowlerId ?? null
  }, [currentInnings])

  const needsNewBowler = isOverComplete && selectedBowlerId === null
  const needsNewBatter =
    currentInnings !== null &&
    !currentInnings.isComplete &&
    currentInnings.currentStrikerId === null &&
    selectedBatterId === null

  // Grouped overs for timeline strip with over separators (walls)
  const groupedOvers = useMemo(() => {
    if (!currentInnings || !config) return []
    return groupEventsIntoOvers(currentInnings.events, config)
  }, [currentInnings, config])

  // Balls in the active over (or last completed over if awaiting new over)
  const thisOverBalls = useMemo(() => {
    if (groupedOvers.length === 0) return []
    const lastOver = groupedOvers[groupedOvers.length - 1]
    return lastOver?.balls ?? []
  }, [groupedOvers])

  // Match result calculation
  const matchResult = useMemo(() => {
    if (!innings1 || !innings2 || !config || !match) return null
    if (!innings2.isComplete) return null

    const team1 = teams[match.innings1BattingTeamId]?.name ?? 'Team 1'
    const team2 = teams[match.innings2BattingTeamId]?.name ?? 'Team 2'

    if (innings2.totalRuns > innings1.totalRuns) {
      const maxWickets = config.lastManStands
        ? config.playersPerSide
        : Math.max(1, config.playersPerSide - 1)
      const wicketsLeft = maxWickets - innings2.wickets
      return `${team2} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}`
    } else if (innings2.totalRuns < innings1.totalRuns) {
      const runDiff = innings1.totalRuns - innings2.totalRuns
      return `${team1} won by ${runDiff} run${runDiff === 1 ? '' : 's'}`
    } else {
      return 'Match Tied'
    }
  }, [innings1, innings2, config, match, teams])

  const isMatchComplete = matchResult !== null

  // Haptics helper
  const triggerHaptic = (type: 'ball' | 'boundary' | 'wicket' | 'undo') => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        switch (type) {
          case 'wicket':
            navigator.vibrate([80, 50, 120, 50, 200])
            break
          case 'boundary':
            navigator.vibrate([40, 30, 60])
            break
          case 'undo':
            navigator.vibrate([30, 30, 30])
            break
          default:
            navigator.vibrate(25)
            break
        }
      } catch {
        // Ignore haptic failures
      }
    }
  }

  // Add ball action
  const addBall = useCallback(
    async (params: AddBallParams) => {
      if (!match || !config) return

      const activeStriker = params.batterId ?? strikerId
      const activeNonStriker = params.nonStrikerId ?? nonStrikerId
      const activeBowler = params.bowlerId ?? bowlerId

      if (!activeStriker || !activeBowler) {
        throw new Error('Striker and Bowler must be set before recording ball')
      }

      const ballEvent: BallEvent = {
        id: `ball-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        inningsNo: currentInningsNo,
        batterId: activeStriker,
        nonStrikerId: activeNonStriker ?? '',
        bowlerId: activeBowler,
        runsOffBat: params.runsOffBat,
        extra: params.extra ?? null,
        wicket: params.wicket ?? null,
        isBoundary4: params.isBoundary4 ?? false,
        isBoundary6: params.isBoundary6 ?? false,
        wallContact: params.wallContact,
        timestamp: Date.now(),
      }

      // Haptic feedback
      if (ballEvent.wicket) {
        triggerHaptic('wicket')
      } else if (ballEvent.isBoundary4 || ballEvent.isBoundary6) {
        triggerHaptic('boundary')
      } else {
        triggerHaptic('ball')
      }

      // Persist to Dexie
      await repo.addBallEvent(match.id, ballEvent)

      // Broadcast live if active
      if (match.isLive && match.shareToken) {
        void broadcastLiveBall(match.shareToken, ballEvent)
      }

      // Clear temporary selection overrides
      setSelectedBowlerId(null)
      setSelectedBatterId(null)

      // Update local events list immediately
      setEvents((prev) => [...prev, ballEvent])
    },
    [
      match,
      config,
      currentInningsNo,
      strikerId,
      nonStrikerId,
      bowlerId,
      repo,
    ],
  )

  // Undo action
  const undo = useCallback(async () => {
    if (!match) return
    triggerHaptic('undo')
    await repo.removeLastBallEvent(match.id, currentInningsNo)

    // Broadcast undo live if active
    if (match.isLive && match.shareToken) {
      void broadcastLiveUndo(match.shareToken, currentInningsNo)
    }

    setEvents((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        const item = prev[i]
        if (item && item.inningsNo === currentInningsNo) {
          return [...prev.slice(0, i), ...prev.slice(i + 1)]
        }
      }
      return prev
    })
    setSelectedBowlerId(null)
    setSelectedBatterId(null)
  }, [match, currentInningsNo, repo])

  const updateMatchLive = useCallback(
    async (isLive: boolean, shareToken?: string) => {
      if (!match) return
      const updates: Partial<MatchRecord> = { isLive }
      if (shareToken !== undefined) {
        updates.shareToken = shareToken
      }
      await repo.updateMatch(match.id, updates)
      setMatch((prev) => (prev ? { ...prev, ...updates } : null))
    },
    [match, repo],
  )

  // Transition to 2nd innings
  const startSecondInnings = useCallback(
    async (openers: {
      strikerId: string
      nonStrikerId: string
      bowlerId: string
    }) => {
      if (!match) return
      await repo.updateMatch(match.id, {
        currentInningsNo: 2,
        innings2Openers: openers,
      })
      setMatch((prev) =>
        prev
          ? {
              ...prev,
              currentInningsNo: 2,
              innings2Openers: openers,
            }
          : null,
      )
      setSelectedBowlerId(openers.bowlerId)
      setSelectedBatterId(openers.strikerId)
    },
    [match, repo],
  )

  const setNewBowler = useCallback((newBowlerId: string) => {
    setSelectedBowlerId(newBowlerId)
  }, [])

  const setNewBatter = useCallback((newBatterId: string) => {
    setSelectedBatterId(newBatterId)
  }, [])

  const recordShotForLastBall = useCallback(
    async (zone: ShotZone) => {
      if (!match) return
      await repo.updateLastBallShot(match.id, currentInningsNo, zone)
      setEvents((prev) => {
        for (let i = prev.length - 1; i >= 0; i--) {
          const e = prev[i]
          if (e && e.inningsNo === currentInningsNo) {
            const updated = { ...e, shot: { zone } }
            return [...prev.slice(0, i), updated, ...prev.slice(i + 1)]
          }
        }
        return prev
      })
    },
    [match, currentInningsNo, repo],
  )

  // Mark match completed when matchResult is computed and update fixture & bracket
  useEffect(() => {
    if (isMatchComplete && match && match.status !== 'completed') {
      void repo.updateMatch(match.id, { status: 'completed' })
      setMatch((prev) => (prev ? { ...prev, status: 'completed' } : null))

      if (match.fixtureId && match.tournamentId) {
        void (async () => {
          await repo.updateFixture(match.fixtureId!, { status: 'completed' })
          const allFixtures = await repo.getFixtures(match.tournamentId!)
          const currFixture = allFixtures.find((f) => f.id === match.fixtureId)
          if (currFixture && currFixture.winnerAdvancesToFixtureId) {
            let winnerTeamId: string | undefined
            if (innings2 && innings1) {
              if (innings2.totalRuns > innings1.totalRuns) {
                winnerTeamId = currFixture.awayTeamId ?? undefined
              } else if (innings1.totalRuns > innings2.totalRuns) {
                winnerTeamId = currFixture.homeTeamId ?? undefined
              }
            }
            if (winnerTeamId) {
              const { fixtures: updated } = advanceKnockoutWinner(
                allFixtures,
                currFixture.id,
                winnerTeamId,
              )
              await repo.saveFixtures(updated)
            }
          }
        })()
      }
    }
  }, [isMatchComplete, match, repo, innings1, innings2])

  return {
    loading,
    error,
    match,
    config,
    teams,
    players,
    events,
    currentInningsNo,
    innings1,
    innings2,
    currentInnings,
    battingTeam,
    bowlingTeam,
    striker,
    nonStriker,
    currentBowler,
    thisOverBalls,
    groupedOvers,
    matchResult,
    isMatchComplete,
    needsNewBowler,
    needsNewBatter,
    previousBowlerId,
    addBall,
    undo,
    startSecondInnings,
    setNewBowler,
    setNewBatter,
    recordShotForLastBall,
    updateMatchLive,
    refresh: loadMatchData,
  }
}
