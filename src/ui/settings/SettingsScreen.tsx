import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Cloud,
  CloudOff,
  RefreshCw,
  Download,
  Mail,
  User,
  Database,
  CheckCircle,
  AlertTriangle,
  UploadCloud,
  BarChart2,
  Compass,
  GitMerge,
  RotateCcw,
  Languages,
} from 'lucide-react'
import { useAuth } from '../../auth/useAuth'
import { syncWorker, type SyncStats } from '../../sync/syncWorker'
import { repository } from '../../db/repository'
import { isSupabaseConfigured } from '../../lib/supabase'
import { clearStatsMemoryCache, STATS_CACHE_VERSION } from '../../stats/memoCache'
import type { PlayerRecord } from '../../db/schema'
import { useTranslation } from '../../i18n'

interface SettingsScreenProps {
  onBack: () => void
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const {
    user,
    isAnonymous,
    isOnline,
    syncState,
    upgradeAccount,
    signInWithOtp,
    signOut,
  } = useAuth()

  const { lang, setLanguage, supportedLanguages } = useTranslation()

  const [email, setEmail] = useState('')
  const [authMsg, setAuthMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [stats, setStats] = useState<SyncStats>({
    pendingCount: 0,
    failedCount: 0,
    lastSyncTime: null,
    isSyncing: false,
  })
  const [forceSyncing, setForceSyncing] = useState(false)
  const [claimMsg, setClaimMsg] = useState<string | null>(null)
  const [claimLoading, setClaimLoading] = useState(false)

  // Stats & Shot Direction Settings
  const [recordShotDirection, setRecordShotDirection] = useState<boolean>(() => {
    return localStorage.getItem('pitchlog_record_shot_direction') === 'true'
  })
  const [cacheRebuiltMsg, setCacheRebuiltMsg] = useState<string | null>(null)

  // Player Merge States
  const [allPlayers, setAllPlayers] = useState<PlayerRecord[]>([])
  const [sourcePlayerId, setSourcePlayerId] = useState('')
  const [targetPlayerId, setTargetPlayerId] = useState('')
  const [mergeLoading, setMergeLoading] = useState(false)
  const [mergeResultMsg, setMergeResultMsg] = useState<string | null>(null)
  const [undoMergeAvailable, setUndoMergeAvailable] = useState<{
    sourceId: string
    targetId: string
  } | null>(null)

  const loadPlayersList = async () => {
    try {
      const list = await repository.listPlayers()
      setAllPlayers(list)
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    void loadPlayersList()
  }, [])

  const handleToggleShotDirection = () => {
    const nextVal = !recordShotDirection
    setRecordShotDirection(nextVal)
    localStorage.setItem('pitchlog_record_shot_direction', nextVal ? 'true' : 'false')
  }

  const handleRebuildStatsCache = () => {
    clearStatsMemoryCache()
    setCacheRebuiltMsg('Stats cache cleared and rebuilt successfully!')
    setTimeout(() => setCacheRebuiltMsg(null), 3000)
  }

  const handleMergePlayers = async () => {
    if (!sourcePlayerId || !targetPlayerId || sourcePlayerId === targetPlayerId) return
    setMergeLoading(true)
    setMergeResultMsg(null)
    try {
      const res = await repository.mergePlayers(sourcePlayerId, targetPlayerId)
      clearStatsMemoryCache()
      setMergeResultMsg(
        `Merged ${res.affectedBalls} ball events into target player. Undo available for 10s.`,
      )
      const currentSource = sourcePlayerId
      const currentTarget = targetPlayerId
      setUndoMergeAvailable({ sourceId: currentSource, targetId: currentTarget })
      setTimeout(() => setUndoMergeAvailable(null), 10000)
      await loadPlayersList()
      setSourcePlayerId('')
      setTargetPlayerId('')
    } catch (err) {
      setMergeResultMsg(`Merge failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setMergeLoading(false)
    }
  }

  const handleUndoMerge = async () => {
    if (!undoMergeAvailable) return
    setMergeLoading(true)
    try {
      const { sourceId, targetId } = undoMergeAvailable
      // Restore source player record
      await repository.savePlayer({
        id: sourceId,
        name: allPlayers.find((p) => p.id === sourceId)?.name ?? 'Restored Player',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      await repository.mergePlayers(targetId, sourceId)
      clearStatsMemoryCache()
      setUndoMergeAvailable(null)
      setMergeResultMsg('Merge undone successfully!')
      await loadPlayersList()
    } catch (err) {
      setMergeResultMsg(`Undo failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setMergeLoading(false)
    }
  }

  const refreshStats = async () => {
    const s = await syncWorker.getStats()
    setStats(s)
  }

  useEffect(() => {
    void refreshStats()
    const interval = setInterval(() => {
      void refreshStats()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setAuthMsg({ type: 'error', text: 'Please enter a valid email address.' })
      return
    }

    setAuthLoading(true)
    setAuthMsg(null)
    try {
      if (user && isAnonymous) {
        // Upgrade current anonymous account so matches are preserved
        const { error } = await upgradeAccount(email.trim())
        if (error) {
          setAuthMsg({ type: 'error', text: error.message })
        } else {
          setAuthMsg({
            type: 'success',
            text: 'Confirmation link sent! Check your email to finish account upgrade.',
          })
        }
      } else {
        // Standard OTP sign in
        const { error } = await signInWithOtp(email.trim())
        if (error) {
          setAuthMsg({ type: 'error', text: error.message })
        } else {
          setAuthMsg({
            type: 'success',
            text: 'Magic link sent! Check your email to sign in.',
          })
        }
      }
    } catch (err) {
      setAuthMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Authentication failed',
      })
    } finally {
      setAuthLoading(false)
    }
  }

  const handleForceSync = async () => {
    setForceSyncing(true)
    try {
      await syncWorker.flushOutbox()
      await refreshStats()
    } finally {
      setForceSyncing(false)
    }
  }

  const handleClaimLocalData = async () => {
    if (!user) return
    setClaimLoading(true)
    setClaimMsg(null)
    try {
      const count = await repository.claimAllLocalData(user.id)
      await syncWorker.flushOutbox()
      await refreshStats()
      setClaimMsg(`Successfully backed up ${count} match${count === 1 ? '' : 'es'} to cloud!`)
    } catch (err) {
      setClaimMsg(`Claim failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setClaimLoading(false)
    }
  }

  const handleExportJson = async () => {
    try {
      const data = await repository.exportAllData()
      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pitchlog-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Export failed
    }
  }

  return (
    <div className="h-screen w-full max-w-md mx-auto flex flex-col justify-between bg-[#080C0E] text-white p-4">
      {/* Top Header */}
      <div className="flex items-center gap-3 border-b border-[#1A262B] pb-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl bg-[#121A1D] border border-slate-800 text-slate-300 hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-lg font-black text-white">Settings & Diagnostics</h2>
          <p className="text-[11px] text-slate-400 font-mono">PitchLog Cloud & Local Backup</p>
        </div>
      </div>

      {/* Main Settings Body */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4">
        {/* Language & Regional Setting */}
        <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages size={18} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white">App Language</h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
              {supportedLanguages.find((l) => l.code === lang)?.nativeName}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {supportedLanguages.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  lang === l.code
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow font-extrabold'
                    : 'bg-[#182328] border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                <div>{l.label}</div>
                <div className="text-[10px] opacity-75 font-normal">{l.nativeName}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Supabase Status / Cloud Config */}
        <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Cloud size={18} className="text-emerald-400" />
              ) : (
                <CloudOff size={18} className="text-amber-400" />
              )}
              <h3 className="text-sm font-bold text-white">Cloud Connection</h3>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                syncState === 'synced'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : syncState === 'syncing'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse'
                  : syncState === 'offline'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {syncState.replace('_', ' ')}
            </span>
          </div>

          <div className="text-xs text-slate-400 flex flex-col gap-1">
            <p>
              Supabase Config:{' '}
              <span className="font-mono text-white">
                {isSupabaseConfigured() ? 'Connected' : 'Offline Mode (Local only)'}
              </span>
            </p>
            <p>
              Network:{' '}
              <span className="font-mono text-white">{isOnline ? 'Online' : 'Airplane Mode'}</span>
            </p>
          </div>
        </div>

        {/* Account / Auth Card */}
        <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <User size={18} className="text-purple-400" />
            <h3 className="text-sm font-bold text-white">Account Status</h3>
          </div>

          <div className="p-3 bg-[#182328] rounded-xl text-xs flex flex-col gap-1 border border-slate-800">
            {user ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mode:</span>
                  <span className="font-bold text-emerald-400">
                    {isAnonymous ? 'Guest (Anonymous Session)' : 'Registered User'}
                  </span>
                </div>
                {user.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-mono text-white">{user.email}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">User ID:</span>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-[170px]">
                    {user.id}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-slate-400">Not signed in. Running in 100% offline local mode.</p>
            )}
          </div>

          {/* Sign In or Upgrade Form */}
          {(!user || isAnonymous) && isSupabaseConfigured() && (
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-2 pt-1">
              <label className="text-xs font-semibold text-slate-300">
                {isAnonymous
                  ? 'Upgrade to permanent account (keeps your data)'
                  : 'Sign in to back up your matches'}
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="flex-1 h-10 bg-[#0A0F11] border border-slate-800 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={authLoading}
                  className="px-4 h-10 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Mail size={14} />
                  <span>{authLoading ? 'Sending...' : 'Send Link'}</span>
                </button>
              </div>

              {authMsg && (
                <div
                  className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
                    authMsg.type === 'success'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {authMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  <span>{authMsg.text}</span>
                </div>
              )}
            </form>
          )}

          {user && !isAnonymous && (
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-1 py-2 px-3 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors text-center"
            >
              Sign Out
            </button>
          )}
        </div>

        {/* Sync Diagnostics Card */}
        <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Sync Diagnostics</h3>
            </div>
            <button
              type="button"
              onClick={handleForceSync}
              disabled={forceSyncing || !isOnline}
              className="p-1.5 bg-[#182328] hover:bg-[#202E34] disabled:opacity-40 text-emerald-400 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <RefreshCw size={12} className={forceSyncing ? 'animate-spin' : ''} />
              <span>Force Sync</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-[#182328] rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Pending Outbox
              </span>
              <p className="text-lg font-mono font-bold text-white mt-0.5">{stats.pendingCount}</p>
            </div>
            <div className="p-3 bg-[#182328] rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Sync Failures
              </span>
              <p
                className={`text-lg font-mono font-bold mt-0.5 ${
                  stats.failedCount > 0 ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {stats.failedCount}
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>Last Synced:</span>
            <span>
              {stats.lastSyncTime
                ? new Date(stats.lastSyncTime).toLocaleTimeString()
                : 'Never'}
            </span>
          </div>

          {/* Claim Local Data button if logged in */}
          {user && (
            <button
              type="button"
              onClick={handleClaimLocalData}
              disabled={claimLoading}
              className="w-full py-2.5 px-3 bg-[#182328] hover:bg-[#202E34] text-emerald-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <UploadCloud size={14} />
              <span>{claimLoading ? 'Backing up...' : 'Back up All Local Matches to Cloud'}</span>
            </button>
          )}

          {claimMsg && (
            <p className="text-xs text-emerald-400 font-medium text-center">{claimMsg}</p>
          )}
        </div>

        {/* Stats Cache & Scoring Options */}
        <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 size={18} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Career Stats & Charts</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-[#182328] border border-slate-800">
              Cache v{STATS_CACHE_VERSION}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Stats are 100% derived on the fly from BallEvents. Rebuilding invalidates any memoized
            aggregates and computes them freshly.
          </p>

          <button
            type="button"
            onClick={handleRebuildStatsCache}
            className="w-full py-2.5 bg-[#182328] hover:bg-[#202E34] text-emerald-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <RefreshCw size={14} />
            <span>Rebuild Stats Cache</span>
          </button>

          {cacheRebuiltMsg && (
            <p className="text-xs text-emerald-400 font-medium text-center">{cacheRebuiltMsg}</p>
          )}

          {/* Shot Direction Toggle */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass size={16} className="text-amber-400" />
              <div>
                <span className="text-xs font-bold text-white block">Capture Shot Direction</span>
                <span className="text-[11px] text-slate-400 block">
                  Show 8-segment wagon wheel picker on runs
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleShotDirection}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                recordShotDirection ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  recordShotDirection ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Player Identity Merge Tool */}
        <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <GitMerge size={18} className="text-purple-400" />
            <h3 className="text-sm font-bold text-white">Merge Duplicate Players</h3>
          </div>
          <p className="text-xs text-slate-400">
            Combine career stats if a player was entered under two different names/IDs. All ball events
            and team rosters will be remapped to the target player.
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Source Player (to be merged & archived)
              </label>
              <select
                value={sourcePlayerId}
                onChange={(e) => setSourcePlayerId(e.target.value)}
                className="w-full h-10 bg-[#0A0F11] border border-slate-700 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Select source duplicate...</option>
                {allPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Target Player (retains all career stats)
              </label>
              <select
                value={targetPlayerId}
                onChange={(e) => setTargetPlayerId(e.target.value)}
                className="w-full h-10 bg-[#0A0F11] border border-slate-700 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="">Select target player...</option>
                {allPlayers
                  .filter((p) => p.id !== sourcePlayerId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id.slice(0, 8)})
                    </option>
                  ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleMergePlayers}
              disabled={mergeLoading || !sourcePlayerId || !targetPlayerId}
              className="mt-1 w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <GitMerge size={14} />
              <span>{mergeLoading ? 'Merging...' : 'Confirm & Merge Players'}</span>
            </button>

            {mergeResultMsg && (
              <div className="text-xs p-2.5 bg-purple-950/60 border border-purple-500/40 rounded-xl text-purple-300 flex items-center justify-between">
                <span>{mergeResultMsg}</span>
                {undoMergeAvailable && (
                  <button
                    type="button"
                    onClick={handleUndoMerge}
                    className="px-2 py-1 bg-purple-500 text-black text-[10px] font-extrabold rounded-md flex items-center gap-1 hover:bg-purple-400"
                  >
                    <RotateCcw size={12} />
                    <span>Undo</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Data Portability / Export */}
        <div className="bg-[#121A1D] border border-[#233238] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-blue-400" />
            <h3 className="text-sm font-bold text-white">Data Portability</h3>
          </div>
          <p className="text-xs text-slate-400">
            Export all your offline and online matches, teams, squads, and ball-by-ball logs into a
            standalone JSON file.
          </p>
          <button
            type="button"
            onClick={handleExportJson}
            className="w-full py-3 bg-[#182328] hover:bg-[#202E34] text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Download size={14} />
            <span>Export All Data as JSON</span>
          </button>
        </div>
      </div>

      {/* App Version Footer */}
      <div className="pt-3 border-t border-[#1A262B] flex items-center justify-between text-xs text-slate-500 font-mono">
        <span>PitchLog Cricket Scorer</span>
        <span>v0.4.0 (Phase 4)</span>
      </div>
    </div>
  )
}
