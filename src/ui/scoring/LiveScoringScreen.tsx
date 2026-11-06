import React, { useState, useRef, useEffect } from 'react'
import {
  RotateCcw,
  Mic,
  MicOff,
  FileText,
  Flame,
  Zap,
  Radio,
  Compass,
} from 'lucide-react'
import type { UseMatchReturn, AddBallParams } from '../../state/useMatch'
import type { VoiceCommand } from '../../voice/types'
import type { ExtraType, Player } from '../../engine/types'
import { BallChip } from '../components/BallChip'
import { ExtrasSheet } from './ExtrasSheet'
import { WicketSheet } from './WicketSheet'
import { SelectBowlerModal } from './SelectBowlerModal'
import { SelectBatterModal } from './SelectBatterModal'
import { InningsBreakModal } from './InningsBreakModal'
import { MatchEndModal, type PlayerMilestoneUnlock } from './MatchEndModal'
import { VoiceFeedbackToast } from './VoiceFeedbackToast'
import { GoLiveModal } from '../live/GoLiveModal'
import { ShotZonePicker } from './ShotZonePicker'
import { generateShareToken } from '../../live/token'
import { useVoiceScoring } from '../../voice/useVoiceScoring'
import { BADGE_DEFINITIONS } from '../../stats/milestones'
import { deriveInningsBatting } from '../../stats/batting'
import { deriveInningsBowling } from '../../stats/bowling'
import { useTranslation } from '../../i18n'

interface LiveScoringScreenProps {
  matchState: UseMatchReturn
  onOpenScorecard: () => void
  onShareScorecard: () => void
  onNewMatch: () => void
}

export const LiveScoringScreen: React.FC<LiveScoringScreenProps> = ({
  matchState,
  onOpenScorecard,
  onShareScorecard,
  onNewMatch,
}) => {
  const {
    match,
    config,
    currentInnings,
    currentInningsNo,
    innings1,
    battingTeam,
    bowlingTeam,
    striker,
    nonStriker,
    currentBowler,
    groupedOvers,
    needsNewBowler,
    needsNewBatter,
    previousBowlerId,
    addBall,
    undo,
    startSecondInnings,
    setNewBowler,
    setNewBatter,
    recordShotForLastBall,
    matchResult,
    isMatchComplete,
    teams,
    players,
    events,
    updateMatchLive,
  } = matchState

  const { lang, setLanguage } = useTranslation()

  // Over timeline strip ref for smooth auto-scrolling
  const overStripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (overStripRef.current) {
      overStripRef.current.scrollLeft = overStripRef.current.scrollWidth
    }
  }, [events.length])

  // Bottom Sheet States
  const [activeExtraType, setActiveExtraType] = useState<ExtraType | null>(null)
  const [showWicketSheet, setShowWicketSheet] = useState<boolean>(false)
  const [showGoLiveModal, setShowGoLiveModal] = useState<boolean>(false)

  // Shot tracking setting & state
  const [recordShotDirection, setRecordShotDirection] = useState<boolean>(() => {
    return localStorage.getItem('pitchlog_record_shot_direction') === 'true'
  })
  const [shotPickerData, setShotPickerData] = useState<{ runs: number } | null>(null)

  const toggleShotDirection = () => {
    const nextVal = !recordShotDirection
    setRecordShotDirection(nextVal)
    localStorage.setItem('pitchlog_record_shot_direction', String(nextVal))
  }

  // Voice scoring integration
  const handleVoiceCommand = async (cmd: VoiceCommand) => {
    setShotPickerData(null)
    if (cmd.type === 'runs') {
      await addBall({
        runsOffBat: cmd.runs,
        isBoundary4: cmd.isBoundary4,
        isBoundary6: cmd.isBoundary6,
      })
      if (recordShotDirection && cmd.runs > 0) {
        setShotPickerData({ runs: cmd.runs })
      }
    } else if (cmd.type === 'extra') {
      await addBall({
        runsOffBat: 0,
        extra: { type: cmd.extraType, runs: cmd.runs },
      })
    } else if (cmd.type === 'wicket') {
      setShowWicketSheet(true)
    } else if (cmd.type === 'undo') {
      await undo()
    }
  }

  const voice = useVoiceScoring({
    onCommand: handleVoiceCommand,
  })

  // Check for newly unlocked milestones when match completes
  const unlockedMilestones = React.useMemo<PlayerMilestoneUnlock[]>(() => {
    if (!isMatchComplete || !match) return []
    const unlocks: PlayerMilestoneUnlock[] = []

    for (const inn of [1, 2]) {
      const innEvents = events.filter((e) => e.inningsNo === inn)
      if (innEvents.length === 0) continue

      const batting = deriveInningsBatting(events, match.id, inn)
      for (const [pId, b] of Object.entries(batting)) {
        const pName = players[pId]?.name ?? pId
        if (b.runs >= 100) {
          unlocks.push({ playerName: pName, badge: { id: 'first_century', ...BADGE_DEFINITIONS.first_century } })
        } else if (b.runs >= 50) {
          unlocks.push({ playerName: pName, badge: { id: 'first_fifty', ...BADGE_DEFINITIONS.first_fifty } })
        }
        if (b.isOut && b.ballsFaced === 1 && b.runs === 0) {
          unlocks.push({ playerName: pName, badge: { id: 'golden_duck', ...BADGE_DEFINITIONS.golden_duck } })
        }
      }

      if (config) {
        const bowling = deriveInningsBowling(events, match.id, inn, config)
        for (const [pId, bw] of Object.entries(bowling)) {
          const pName = players[pId]?.name ?? pId
          if (bw.wickets >= 5) {
            unlocks.push({ playerName: pName, badge: { id: 'five_wicket_haul', ...BADGE_DEFINITIONS.five_wicket_haul } })
          }
          if (bw.hatTricks >= 1) {
            unlocks.push({ playerName: pName, badge: { id: 'hat_trick', ...BADGE_DEFINITIONS.hat_trick } })
          }
        }
      }
    }

    return unlocks
  }, [isMatchComplete, match, events, config, players])

  if (!match || !config || !currentInnings) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#080C0E] text-slate-400 font-mono text-sm">
        Loading Match State...
      </div>
    )
  }

  // Current Run Rate (CRR)
  const crr =
    currentInnings.legalBalls > 0
      ? Number(
          (
            currentInnings.totalRuns /
            (currentInnings.legalBalls / 6)
          ).toFixed(2),
        )
      : 0

  // Chase calculations for 2nd innings
  const chase = currentInnings.chaseInfo
  const isChaseTight = chase !== null && crr > 0 && chase.requiredRunRate > 2 * crr

  // Batters stats
  const strikerStats = striker ? currentInnings.batterStats[striker.id] : null
  const nonStrikerStats = nonStriker
    ? currentInnings.batterStats[nonStriker.id]
    : null
  const bowlerStats = currentBowler
    ? currentInnings.bowlerStats[currentBowler.id]
    : null

  // Teams player lists
  const battingPlayerIds = battingTeam?.playerIds ?? []
  const bowlingPlayerIds = bowlingTeam?.playerIds ?? []
  const battingPlayers = battingPlayerIds
    .map((id) => players[id])
    .filter((p): p is Player => p !== undefined)
  const bowlingPlayers = bowlingPlayerIds
    .map((id) => players[id])
    .filter((p): p is Player => p !== undefined)

  const outBatterIds = new Set(
    Object.values(currentInnings.batterStats)
      .filter((s) => s.isOut)
      .map((s) => s.playerId),
  )

  const availableIncomingBatters = battingPlayers.filter(
    (p) =>
      p.id !== striker?.id &&
      p.id !== nonStriker?.id &&
      !outBatterIds.has(p.id),
  )

  // Direct runs tap handler
  const handleScoreRuns = async (runs: number, is4 = false, is6 = false) => {
    setShotPickerData(null)
    await addBall({
      runsOffBat: runs,
      isBoundary4: is4,
      isBoundary6: is6,
    })
    if (recordShotDirection && runs > 0) {
      setShotPickerData({ runs })
    }
  }

  return (
    <div className="h-screen w-full max-w-md mx-auto flex flex-col justify-between bg-[#080C0E] text-white overflow-hidden relative select-none">
      {/* Voice feedback toast */}
      <VoiceFeedbackToast
        isListening={voice.isListening}
        lastTranscript={voice.lastTranscript}
        pendingCommand={voice.pendingCommand}
        countdown={voice.countdown}
        onCancelPending={voice.cancelPending}
        onUndoLast={undo}
      />

      {/* TOP ZONE: Header + Scoreboard + Strips */}
      <div className="flex flex-col flex-shrink-0 pt-2 px-3 gap-2">
        {/* Match Top Bar */}
        <div className="flex items-center justify-between border-b border-[#1A262B] pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300 truncate max-w-[170px]">
              {battingTeam?.name ?? 'Batting'}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#182328] text-emerald-400 border border-emerald-500/20">
              Inn {currentInningsNo}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language Switcher */}
            <div className="flex items-center rounded-lg bg-[#121A1D] border border-slate-700 p-0.5 text-[9px] font-bold">
              {(['en', 'hi', 'gu'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l)}
                  className={`px-1.5 py-0.5 rounded uppercase transition-colors ${
                    lang === l
                      ? 'bg-emerald-500 text-black font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowGoLiveModal(true)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                match.isLive
                  ? 'bg-rose-500/20 border-rose-500/60 text-rose-400'
                  : 'bg-[#121A1D] border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
              }`}
            >
              <Radio size={14} className={match.isLive ? 'text-rose-400 animate-pulse' : 'text-slate-400'} />
              <span>{match.isLive ? 'LIVE' : 'Go Live'}</span>
            </button>

            <button
              type="button"
              onClick={toggleShotDirection}
              title={recordShotDirection ? 'Shot Tracking ON' : 'Shot Tracking OFF'}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                recordShotDirection
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400'
                  : 'bg-[#121A1D] border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
              }`}
            >
              <Compass size={14} />
            </button>

            <button
              type="button"
              onClick={onOpenScorecard}
              className="p-1.5 rounded-lg bg-[#121A1D] border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <FileText size={14} />
              <span>Card</span>
            </button>
          </div>
        </div>

        {/* Huge Display Numerals: Score & Overs */}
        <div className="flex items-baseline justify-between px-1 py-1">
          <div className="flex items-baseline gap-1">
            <span className="font-mono font-black tabular-nums tracking-tighter text-6xl text-white drop-shadow-sm">
              {currentInnings.totalRuns}
            </span>
            <span className="font-mono font-bold text-3xl text-rose-500">
              /{currentInnings.wickets}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Overs
              </span>
              <span className="font-mono font-black tabular-nums text-3xl text-white">
                {currentInnings.overs}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                /{config.oversPerInnings}
              </span>
            </div>
            <div className="text-[11px] font-semibold text-slate-400 font-mono">
              CRR: <span className="text-emerald-400">{crr}</span>
            </div>
          </div>
        </div>

        {/* Free Hit Banner */}
        {currentInnings.isFreeHit && (
          <div className="flex items-center justify-center gap-2 py-1 px-3 rounded-lg bg-amber-500 text-black font-black text-xs uppercase tracking-wider animate-pulse shadow-md shadow-amber-950/50">
            <Zap size={14} fill="currentColor" />
            <span>FREE HIT NEXT BALL</span>
          </div>
        )}

        {/* 2nd Innings Chase Banner */}
        {chase && currentInningsNo === 2 && (
          <div
            className={`flex items-center justify-between py-1.5 px-3 rounded-xl border text-xs font-mono font-bold transition-colors ${
              isChaseTight
                ? 'bg-rose-950/70 border-rose-500/80 text-rose-200'
                : 'bg-[#121A1D] border-emerald-500/30 text-emerald-400'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {isChaseTight && <Flame size={14} className="text-rose-400 animate-bounce" />}
              <span>Need {chase.runsNeeded} off {chase.ballsRemaining} balls</span>
            </div>
            <span>RRR: {chase.requiredRunRate === Infinity ? '∞' : chase.requiredRunRate}</span>
          </div>
        )}

        {/* Active Batters & Bowler Strips */}
        <div className="bg-[#121A1D] border border-[#233238] rounded-xl p-2.5 flex flex-col gap-2 shadow-lg">
          {/* Striker & Non-Striker Row */}
          <div className="grid grid-cols-2 gap-2 text-xs divide-x divide-slate-800">
            {/* Striker */}
            <div className="flex flex-col pr-1">
              <div className="flex items-center gap-1 text-emerald-400 font-bold truncate">
                <span className="text-[11px]">🏏</span>
                <span className="truncate text-white font-extrabold">
                  {striker?.name ?? 'Awaiting Striker'}
                </span>
                <span className="text-[10px] text-emerald-400">*</span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono font-semibold mt-0.5">
                {strikerStats?.runs ?? 0}
                <span className="text-slate-500">({strikerStats?.ballsFaced ?? 0})</span>
                <span className="text-[10px] text-slate-400 ml-1.5 font-normal">
                  4s:{strikerStats?.fours ?? 0} 6s:{strikerStats?.sixes ?? 0}
                </span>
              </div>
            </div>

            {/* Non-Striker */}
            <div className="flex flex-col pl-2">
              <div className="text-slate-300 font-bold truncate">
                {nonStriker?.name ?? (config.lastManStands ? 'Lone Batter' : 'Non-Striker')}
              </div>
              <div className="text-[11px] text-slate-300 font-mono font-semibold mt-0.5">
                {nonStrikerStats?.runs ?? 0}
                <span className="text-slate-500">({nonStrikerStats?.ballsFaced ?? 0})</span>
                <span className="text-[10px] text-slate-400 ml-1.5 font-normal">
                  4s:{nonStrikerStats?.fours ?? 0} 6s:{nonStrikerStats?.sixes ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Current Bowler Strip */}
          <div className="pt-2 border-t border-[#1C282D] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[10px] uppercase font-bold text-slate-400">Bowler:</span>
              <span className="font-bold text-white truncate">
                {currentBowler?.name ?? 'Select Bowler'}
              </span>
            </div>
            <div className="font-mono text-slate-300 font-semibold text-[11px] flex-shrink-0">
              {bowlerStats?.overs ?? '0.0'}-{bowlerStats?.maidens ?? 0}-
              {bowlerStats?.runsConceded ?? 0}-
              <span className="text-rose-400 font-bold">{bowlerStats?.wickets ?? 0}</span>
              <span className="text-[10px] text-slate-500 ml-1">
                (E:{bowlerStats?.economy ?? 0})
              </span>
            </div>
          </div>
        </div>

        {/* Over Timeline Strip with Over Separator (Wall) */}
        <div
          ref={overStripRef}
          className="flex items-center gap-1.5 py-1.5 px-2 bg-[#0E1517] border border-[#1A262B] rounded-xl overflow-x-auto scrollbar-none"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap pl-1">
            This Over:
          </span>
          {groupedOvers.length === 0 ? (
            <span className="text-xs text-slate-600 font-mono italic pl-2">
              Waiting for 1st ball...
            </span>
          ) : (
            groupedOvers.map((ov, ovIdx) => (
              <React.Fragment key={ov.overNumber}>
                {/* Small Wall divider between overs */}
                {ovIdx > 0 && (
                  <div
                    className="flex items-center px-1 flex-shrink-0"
                    title={`End of Over ${ov.overNumber - 1}`}
                  >
                    <div className="w-[3px] h-7 bg-slate-500/80 rounded-full shadow-sm" />
                  </div>
                )}

                {/* Over balls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {ov.balls.map((b) => (
                    <BallChip key={b.id} ball={b} />
                  ))}
                </div>

                {/* If this over just completed and it is the latest over, show the small wall after it and next over badge */}
                {ov.isCompleted && ovIdx === groupedOvers.length - 1 && (
                  <>
                    <div
                      className="flex items-center px-1 flex-shrink-0"
                      title={`End of Over ${ov.overNumber}`}
                    >
                      <div className="w-[3px] h-7 bg-emerald-500/80 rounded-full shadow-sm" />
                    </div>
                    {!isMatchComplete && (
                      <span className="text-[10px] font-mono font-bold text-emerald-400/90 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 whitespace-nowrap flex-shrink-0 animate-pulse">
                        Ov {ov.overNumber + 1}
                      </span>
                    )}
                  </>
                )}
              </React.Fragment>
            ))
          )}
        </div>
      </div>

      {/* BOTTOM THUMB ZONE: Scoring Pad (strictly no scrolling, min tap target 56px) */}
      <div className="flex flex-col flex-shrink-0 p-3 bg-[#0A0F11] border-t border-[#1A262B] gap-2">
        {/* Gully Rules Quick Bar (Wall & Dead Ball) */}
        {config.matchRules?.wallRules?.enabled && (
          <div className="grid grid-cols-4 gap-1.5 pb-1">
            <button
              type="button"
              onClick={() =>
                addBall({
                  runsOffBat: 4,
                  isBoundary4: true,
                  wallContact: {
                    wallId: 'wall-1',
                    contactType: 'direct_hit',
                    runsAwarded: 4,
                    isOut: false,
                  },
                })
              }
              className="py-1.5 px-1 rounded-lg bg-[#172227] hover:bg-[#202E34] border border-emerald-500/40 text-[10px] font-bold text-emerald-300 flex items-center justify-center gap-1 shadow-sm active:scale-95"
            >
              🧱 Wall 4
            </button>

            <button
              type="button"
              onClick={() =>
                addBall({
                  runsOffBat: 1,
                  wallContact: {
                    wallId: 'wall-1',
                    contactType: 'ground_tap',
                    runsAwarded: 1,
                    isOut: false,
                  },
                })
              }
              className="py-1.5 px-1 rounded-lg bg-[#172227] hover:bg-[#202E34] border border-slate-700 text-[10px] font-bold text-slate-300 flex items-center justify-center gap-1 shadow-sm active:scale-95"
            >
              🧱 Tap 1
            </button>

            {config.matchRules.wallRules.carOrWindowDirectHitOut && (
              <button
                type="button"
                onClick={() => {
                  if (!striker) return
                  setShowWicketSheet(true)
                }}
                className="py-1.5 px-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/40 text-[10px] font-bold text-rose-300 flex items-center justify-center gap-1 shadow-sm active:scale-95"
              >
                🚗 Car Out
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                alert('Dead Ball called! Re-bowl delivery without scoring.')
              }}
              className="py-1.5 px-1 rounded-lg bg-[#182328] hover:bg-[#202E34] border border-amber-500/40 text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1 shadow-sm active:scale-95"
            >
              🚫 Dead Ball
            </button>
          </div>
        )}

        {/* Keypad Row 1: 0, 1, 2, 3 */}
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleScoreRuns(r)}
              className="h-14 min-h-[56px] rounded-xl bg-[#121A1D] hover:bg-[#1C282D] text-white border border-[#233238] font-mono text-2xl font-black transition-all active:scale-95 shadow-md flex items-center justify-center"
            >
              {r}
            </button>
          ))}
        </div>

        {/* Keypad Row 2: 4 (Boundary), 6 (Maximum), 5 */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleScoreRuns(4, true, false)}
            className="h-14 min-h-[56px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-2xl font-black transition-all active:scale-95 shadow-lg shadow-emerald-950/40 flex items-center justify-center border border-emerald-400"
          >
            4
          </button>

          <button
            type="button"
            onClick={() => handleScoreRuns(6, false, true)}
            className="h-14 min-h-[56px] rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-2xl font-black transition-all active:scale-95 shadow-lg shadow-purple-950/40 flex items-center justify-center border border-purple-400"
          >
            6
          </button>

          <button
            type="button"
            onClick={() => handleScoreRuns(5)}
            className="h-14 min-h-[56px] rounded-xl bg-[#121A1D] hover:bg-[#1C282D] text-slate-200 border border-[#233238] font-mono text-2xl font-black transition-all active:scale-95 shadow-md flex items-center justify-center"
          >
            5
          </button>
        </div>

        {/* Keypad Row 3: Wide, No-ball, Bye/Leg-bye, Wicket */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setActiveExtraType('wide')}
            className="h-14 min-h-[56px] rounded-xl bg-[#182328] hover:bg-[#202E34] text-amber-400 border border-amber-500/40 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center"
          >
            Wide
          </button>

          <button
            type="button"
            onClick={() => setActiveExtraType('noball')}
            className="h-14 min-h-[56px] rounded-xl bg-[#182328] hover:bg-[#202E34] text-amber-400 border border-amber-500/40 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center"
          >
            No-Ball
          </button>

          <button
            type="button"
            onClick={() => setActiveExtraType('bye')}
            className="h-14 min-h-[56px] rounded-xl bg-[#182328] hover:bg-[#202E34] text-slate-300 border border-slate-700 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center"
          >
            Bye/Lb
          </button>

          <button
            type="button"
            onClick={() => setShowWicketSheet(true)}
            className="h-14 min-h-[56px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-rose-950/40 border border-rose-400 flex items-center justify-center"
          >
            Out / Wkt
          </button>
        </div>

        {/* Bottom Utility Bar: Large Undo, Mic (Voice toggle), Share / Menu */}
        <div className="grid grid-cols-5 gap-2 pt-1">
          {/* Large Undo Button (Takes 3 columns) */}
          <button
            type="button"
            onClick={undo}
            className="col-span-3 h-14 min-h-[56px] rounded-xl bg-[#182328] hover:bg-[#223238] border border-slate-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow"
          >
            <RotateCcw size={18} className="text-emerald-400" />
            <span>UNDO BALL</span>
          </button>

          {/* Voice Mic Toggle */}
          <button
            type="button"
            onClick={voice.toggleListening}
            title={voice.isSupported ? 'Toggle Voice Scoring' : 'Voice not supported in this browser'}
            className={`col-span-1 h-14 min-h-[56px] rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
              voice.isListening
                ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-950/50 animate-pulse'
                : voice.isSupported
                ? 'bg-[#182328] hover:bg-[#223238] text-emerald-400 border-slate-700'
                : 'bg-[#10171A] text-slate-600 border-slate-800 opacity-50 cursor-not-allowed'
            }`}
          >
            {voice.isListening ? <Mic size={22} /> : <MicOff size={22} />}
          </button>

          {/* Scorecard quick view */}
          <button
            type="button"
            onClick={onOpenScorecard}
            title="View Scorecard"
            className="col-span-1 h-14 min-h-[56px] rounded-xl bg-[#182328] hover:bg-[#223238] border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-95"
          >
            <FileText size={20} />
          </button>
        </div>
      </div>

      {/* MODALS & SHEETS */}

      {/* Extras Bottom Sheet */}
      {activeExtraType && (
        <ExtrasSheet
          initialType={activeExtraType}
          onClose={() => setActiveExtraType(null)}
          onConfirm={addBall}
        />
      )}

      {/* Wicket Bottom Sheet */}
      {showWicketSheet && (
        <WicketSheet
          striker={striker}
          nonStriker={nonStriker}
          battingPlayers={battingPlayers}
          bowlingPlayers={bowlingPlayers}
          outBatterIds={outBatterIds}
          isFreeHit={currentInnings.isFreeHit}
          lastManStands={config.lastManStands}
          totalWicketsSoFar={currentInnings.wickets}
          playersPerSide={config.playersPerSide}
          matchRules={config.matchRules}
          onClose={() => setShowWicketSheet(false)}
          onConfirm={async (params: AddBallParams, nextId?: string) => {
            await addBall(params)
            if (nextId) {
              setNewBatter(nextId)
            }
          }}
        />
      )}

      {/* Select Next Bowler Modal (Over completion) */}
      {needsNewBowler && !isMatchComplete && (
        <SelectBowlerModal
          bowlingPlayers={bowlingPlayers}
          previousBowlerId={previousBowlerId}
          onSelectBowler={setNewBowler}
        />
      )}

      {/* Select Next Batter Modal (When striker out and no new batter picked) */}
      {needsNewBatter && !isMatchComplete && availableIncomingBatters.length > 0 && (
        <SelectBatterModal
          availableBatters={availableIncomingBatters}
          onSelectBatter={setNewBatter}
        />
      )}

      {/* Innings Break Modal */}
      {currentInningsNo === 1 && currentInnings.isComplete && !isMatchComplete && innings1 && (
        <InningsBreakModal
          innings1={innings1}
          team1={teams[match.innings1BattingTeamId]!}
          team2={teams[match.innings1BowlingTeamId]!}
          team1Players={
            match.innings1BattingTeamId
              ? (teams[match.innings1BattingTeamId]?.playerIds ?? []).map((id) => players[id]!).filter(Boolean)
              : []
          }
          team2Players={
            match.innings1BowlingTeamId
              ? (teams[match.innings1BowlingTeamId]?.playerIds ?? []).map((id) => players[id]!).filter(Boolean)
              : []
          }
          onStartInnings2={startSecondInnings}
        />
      )}

      {/* Match Completed Modal */}
      {isMatchComplete && matchResult && (
        <MatchEndModal
          resultText={matchResult}
          newMilestones={unlockedMilestones}
          onViewScorecard={onOpenScorecard}
          onShareImage={onShareScorecard}
          onNewMatch={onNewMatch}
        />
      )}

      {/* Go Live Modal */}
      {showGoLiveModal && (
        <GoLiveModal
          isLive={Boolean(match.isLive)}
          shareToken={match.shareToken}
          teamAName={teams[match.teamAId]?.name ?? 'Team A'}
          teamBName={teams[match.teamBId]?.name ?? 'Team B'}
          onToggleLive={async (active, token) => {
            await updateMatchLive(active, token)
          }}
          onRegenerateToken={async () => {
            const newToken = generateShareToken()
            await updateMatchLive(Boolean(match.isLive), newToken)
          }}
          onClose={() => setShowGoLiveModal(false)}
        />
      )}

      {/* Non-blocking 8-Segment Shot Zone Picker */}
      {shotPickerData && (
        <ShotZonePicker
          runs={shotPickerData.runs}
          onSelectZone={async (zone) => {
            await recordShotForLastBall(zone)
            setShotPickerData(null)
          }}
          onDismiss={() => setShotPickerData(null)}
        />
      )}
    </div>
  )
}
