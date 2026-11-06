import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Radio, RefreshCw, FileText, ArrowLeft, BarChart2 } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { deriveInnings } from '../../engine/innings'
import type { BallEvent, MatchConfig } from '../../engine/types'
import { BallChip } from '../components/BallChip'
import { MatchAnalyticsView } from '../analytics/MatchAnalyticsView'
import type { MatchRecord, PlayerRecord } from '../../db/schema'

interface LiveViewerScreenProps {
  token: string
  onBackToApp?: () => void
}

interface LiveMatchPayload {
  match: {
    id: string
    config: MatchConfig
    team_a: { name?: string; id?: string }
    team_b: { name?: string; id?: string }
    status: string
    is_live: boolean
    current_innings_no?: number
  }
  events: Array<{
    id: string
    match_id: string
    seq: number
    payload: BallEvent
    created_at: string
  }>
}

export const LiveViewerScreen: React.FC<LiveViewerScreenProps> = ({
  token,
  onBackToApp,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [matchData, setMatchData] = useState<LiveMatchPayload['match'] | null>(null)
  const [events, setEvents] = useState<BallEvent[]>([])
  const [connected, setConnected] = useState<boolean>(true)
  const [lastUpdatedSec, setLastUpdatedSec] = useState<number>(0)
  const [viewTab, setViewTab] = useState<'live' | 'scorecard' | 'analytics'>('live')
  const lastUpdateTimestampRef = useRef<number>(Date.now())

  // Load live match data via RPC
  const fetchLiveMatch = async () => {
    if (!isSupabaseConfigured()) {
      setError('Live viewer requires Supabase configuration.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error: rpcError } = await supabase.rpc('get_live_match', {
        token,
      })

      if (rpcError || !data) {
        setError('Match not found or broadcast is offline.')
        setLoading(false)
        return
      }

      const payload = data as LiveMatchPayload
      setMatchData(payload.match)
      setEvents(payload.events.map((e) => e.payload))
      lastUpdateTimestampRef.current = Date.now()
      setLastUpdatedSec(0)
      setError(null)
    } catch {
      setError('Failed to connect to live match stream.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchLiveMatch()

    // 1-second ticker for "Last updated Xs ago"
    const ticker = setInterval(() => {
      const elapsed = Math.round((Date.now() - lastUpdateTimestampRef.current) / 1000)
      setLastUpdatedSec(elapsed)
    }, 1000)

    // Realtime Broadcast channel subscription
    if (!isSupabaseConfigured()) return () => clearInterval(ticker)

    const channel = supabase.channel(`live-match:${token}`)

    channel
      .on('broadcast', { event: 'ball_added' }, (payload) => {
        const newBall = payload.payload as BallEvent
        setEvents((prev) => {
          // Idempotency check
          if (prev.some((b) => b.id === newBall.id)) return prev
          return [...prev, newBall]
        })
        lastUpdateTimestampRef.current = Date.now()
        setLastUpdatedSec(0)
      })
      .on('broadcast', { event: 'ball_undone' }, (payload) => {
        const { inningsNo } = payload.payload as { inningsNo: number }
        setEvents((prev) => {
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i]?.inningsNo === inningsNo) {
              return [...prev.slice(0, i), ...prev.slice(i + 1)]
            }
          }
          return prev
        })
        lastUpdateTimestampRef.current = Date.now()
        setLastUpdatedSec(0)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnected(false)
        }
      })

    return () => {
      clearInterval(ticker)
      void supabase.removeChannel(channel)
    }
  }, [token])

  // Derive innings using pure engine
  const config = matchData?.config

  const innings1Events = useMemo(
    () => events.filter((e) => e.inningsNo === 1),
    [events],
  )
  const innings2Events = useMemo(
    () => events.filter((e) => e.inningsNo === 2),
    [events],
  )

  const innings1 = useMemo(() => {
    if (!config) return null
    return deriveInnings(config, innings1Events)
  }, [config, innings1Events])

  const innings2 = useMemo(() => {
    if (!config || !innings1) return null
    return deriveInnings(config, innings2Events, {
      target: innings1.totalRuns + 1,
    })
  }, [config, innings1, innings2Events])

  const currentInningsNo = innings2Events.length > 0 || (innings1?.isComplete ?? false) ? 2 : 1
  const currentInnings = currentInningsNo === 1 ? innings1 : (innings2 ?? innings1)

  // Commentary text for recent balls
  const commentaryList = useMemo(() => {
    return [...events]
      .reverse()
      .slice(0, 6)
      .map((b) => {
        if (b.wicket) {
          return `WICKET! ${b.batterId} is out (${b.wicket.type})`
        }
        if (b.isBoundary6) {
          return `MAXIMUM! ${b.batterId} hits a huge SIX!`
        }
        if (b.isBoundary4) {
          return `FOUR! Cracking boundary by ${b.batterId}`
        }
        if (b.extra?.type === 'wide') {
          return `Wide ball bowled by ${b.bowlerId}`
        }
        if (b.extra?.type === 'noball') {
          return `No-ball! Free Hit awarded`
        }
        if (b.runsOffBat === 0) {
          return `Dot ball to ${b.batterId}`
        }
        return `${b.runsOffBat} run${b.runsOffBat > 1 ? 's' : ''} taken by ${b.batterId}`
      })
  }, [events])

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#080C0E] text-white p-4 font-mono text-sm">
        <RefreshCw size={24} className="text-emerald-400 animate-spin mb-3" />
        <span>Connecting to live match stream...</span>
      </div>
    )
  }

  if (error || !matchData || !currentInnings || !config) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#080C0E] text-white p-6 text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
          <Radio size={28} />
        </div>
        <h2 className="text-lg font-bold text-white">Broadcast Offline</h2>
        <p className="text-xs text-slate-400 max-w-xs">
          {error ?? 'This match is no longer broadcasting live.'}
        </p>
        <button
          type="button"
          onClick={fetchLiveMatch}
          className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-extrabold text-xs"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  const teamAName = matchData.team_a?.name ?? 'Team A'
  const teamBName = matchData.team_b?.name ?? 'Team B'
  const battingTeamName = currentInningsNo === 1 ? teamAName : teamBName

  // Synthesize match & player records for analytics view
  const syntheticMatch: MatchRecord = useMemo(() => {
    return {
      id: matchData.id,
      date: new Date().toISOString(),
      teamAId: matchData.team_a?.id ?? 'team-a',
      teamBId: matchData.team_b?.id ?? 'team-b',
      tossWinnerId: matchData.team_a?.id ?? 'team-a',
      tossDecision: 'bat',
      currentInningsNo,
      status: matchData.status as 'in_progress' | 'completed' | 'abandoned',
      innings1BattingTeamId: matchData.team_a?.id ?? 'team-a',
      innings1BowlingTeamId: matchData.team_b?.id ?? 'team-b',
      innings2BattingTeamId: matchData.team_b?.id ?? 'team-b',
      innings2BowlingTeamId: matchData.team_a?.id ?? 'team-a',
      innings1Openers: {
        strikerId: events[0]?.batterId ?? 'p1',
        nonStrikerId: events[0]?.nonStrikerId ?? 'p2',
        bowlerId: events[0]?.bowlerId ?? 'b1',
      },
      isLive: matchData.is_live,
      config: matchData.config,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }, [matchData, currentInningsNo, events])

  const synthesizedPlayers: Record<string, PlayerRecord> = useMemo(() => {
    const map: Record<string, PlayerRecord> = {}
    for (const ev of events) {
      if (ev.batterId && !map[ev.batterId]) {
        map[ev.batterId] = {
          id: ev.batterId,
          name: ev.batterId,
          createdAt: 0,
          updatedAt: 0,
        }
      }
      if (ev.nonStrikerId && !map[ev.nonStrikerId]) {
        map[ev.nonStrikerId] = {
          id: ev.nonStrikerId,
          name: ev.nonStrikerId,
          createdAt: 0,
          updatedAt: 0,
        }
      }
      if (ev.bowlerId && !map[ev.bowlerId]) {
        map[ev.bowlerId] = {
          id: ev.bowlerId,
          name: ev.bowlerId,
          createdAt: 0,
          updatedAt: 0,
        }
      }
      if (ev.wicket?.playerOutId && !map[ev.wicket.playerOutId]) {
        map[ev.wicket.playerOutId] = {
          id: ev.wicket.playerOutId,
          name: ev.wicket.playerOutId,
          createdAt: 0,
          updatedAt: 0,
        }
      }
      if (ev.wicket?.fielderId && !map[ev.wicket.fielderId]) {
        map[ev.wicket.fielderId] = {
          id: ev.wicket.fielderId,
          name: ev.wicket.fielderId,
          createdAt: 0,
          updatedAt: 0,
        }
      }
    }
    return map
  }, [events])

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col justify-between bg-[#080C0E] text-white overflow-hidden select-none">
      {/* Header */}
      <div className="p-3 border-b border-[#1A262B] bg-[#0E1517] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <span className="font-mono font-black text-xs uppercase tracking-wider text-emerald-400">
            PITCHLOG LIVE
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Live indicator badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-600/20 border border-rose-500/40 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>LIVE</span>
          </div>

          <span className="text-[10px] font-mono text-slate-400">
            {connected ? `${lastUpdatedSec}s ago` : 'Reconnecting...'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 p-1.5 bg-[#0A0F11] border-b border-[#1A262B] gap-1.5">
        <button
          type="button"
          onClick={() => setViewTab('live')}
          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
            viewTab === 'live'
              ? 'bg-emerald-500 text-black font-extrabold shadow'
              : 'bg-[#121A1D] text-slate-400'
          }`}
        >
          Live Match
        </button>
        <button
          type="button"
          onClick={() => setViewTab('scorecard')}
          className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            viewTab === 'scorecard'
              ? 'bg-emerald-500 text-black font-extrabold shadow'
              : 'bg-[#121A1D] text-slate-400'
          }`}
        >
          <FileText size={13} />
          <span>Scorecard</span>
        </button>
        <button
          type="button"
          onClick={() => setViewTab('analytics')}
          className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            viewTab === 'analytics'
              ? 'bg-emerald-500 text-black font-extrabold shadow'
              : 'bg-[#121A1D] text-slate-400'
          }`}
        >
          <BarChart2 size={13} />
          <span>Analytics</span>
        </button>
      </div>

      {viewTab === 'live' ? (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Main Scorecard Header */}
          <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-white uppercase tracking-wider">
                {battingTeamName} (Inn {currentInningsNo})
              </span>
              <span className="font-mono">CRR: {(currentInnings.totalRuns / Math.max(0.1, currentInnings.legalBalls / 6)).toFixed(2)}</span>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-6xl font-black text-white">
                  {currentInnings.totalRuns}
                </span>
                <span className="text-3xl font-bold text-rose-500">
                  /{currentInnings.wickets}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 uppercase font-bold block">Overs</span>
                <span className="font-mono text-2xl font-bold text-white">
                  {currentInnings.overs}/{config.oversPerInnings}
                </span>
              </div>
            </div>

            {/* Chase banner */}
            {currentInnings.chaseInfo && currentInningsNo === 2 && (
              <div className="mt-2 py-1.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center justify-between">
                <span>Need {currentInnings.chaseInfo.runsNeeded} off {currentInnings.chaseInfo.ballsRemaining} balls</span>
                <span>RRR: {currentInnings.chaseInfo.requiredRunRate}</span>
              </div>
            )}
          </div>

          {/* This-Over Chips */}
          <div className="p-3 bg-[#121A1D] border border-[#233238] rounded-xl flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pr-1">
              This Over:
            </span>
            {currentInnings.events.slice(-6).map((b) => (
              <BallChip key={b.id} ball={b} />
            ))}
          </div>

          {/* Live Ball-by-Ball Commentary */}
          <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Recent Action
            </h4>
            <div className="flex flex-col gap-2">
              {commentaryList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-[#182328] rounded-xl border border-slate-800 text-xs text-slate-200 flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : viewTab === 'scorecard' ? (
        /* Scorecard Tab */
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
          <div className="bg-[#121A1D] border border-[#233238] rounded-xl p-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
              Innings 1: {teamAName} ({innings1?.totalRuns ?? 0}/{innings1?.wickets ?? 0})
            </h4>
            {innings2 && (
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Innings 2: {teamBName} ({innings2.totalRuns}/{innings2.wickets})
              </h4>
            )}
          </div>
        </div>
      ) : (
        /* Analytics Tab */
        <div className="flex-1 overflow-y-auto">
          <MatchAnalyticsView
            match={syntheticMatch}
            events={events}
            players={synthesizedPlayers}
            team1Name={teamAName}
            team2Name={teamBName}
            target={innings1 ? innings1.totalRuns + 1 : undefined}
          />
        </div>
      )}

      {/* Footer */}
      <div className="p-2 border-t border-[#1A262B] bg-[#0E1517] text-center text-[10px] text-slate-500 font-mono">
        Watching live on PitchLog PWA
      </div>
    </div>
  )
}
