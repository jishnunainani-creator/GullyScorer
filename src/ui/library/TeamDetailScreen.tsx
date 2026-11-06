import React, { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react'
import { repository } from '../../db/repository'
import type { TeamRecord, PlayerRecord } from '../../db/schema'

interface TeamDetailScreenProps {
  team: TeamRecord
  onBack: () => void
}

export const TeamDetailScreen: React.FC<TeamDetailScreenProps> = ({
  team,
  onBack,
}) => {
  const [currentTeam, setCurrentTeam] = useState<TeamRecord>(team)
  const [players, setPlayers] = useState<PlayerRecord[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [teamName, setTeamName] = useState(team.name)
  const [isSaved, setIsSaved] = useState(false)

  const loadPlayers = async () => {
    if (currentTeam.playerIds.length === 0) {
      setPlayers([])
      return
    }
    const loaded = await repository.getPlayers(currentTeam.playerIds)
    setPlayers(loaded.filter((p) => !p.deletedAt))
  }

  useEffect(() => {
    void loadPlayers()
  }, [currentTeam.playerIds])

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return
    const names = newPlayerName
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    const newPlayers: PlayerRecord[] = []
    const newPlayerIds: string[] = []

    for (const name of names) {
      const pId = `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const playerRecord: PlayerRecord = {
        id: pId,
        name,
        teamId: currentTeam.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await repository.savePlayer(playerRecord)
      newPlayers.push(playerRecord)
      newPlayerIds.push(pId)
    }

    const updatedTeam: TeamRecord = {
      ...currentTeam,
      name: teamName,
      playerIds: [...currentTeam.playerIds, ...newPlayerIds],
      updatedAt: Date.now(),
    }
    await repository.saveTeam(updatedTeam)
    setCurrentTeam(updatedTeam)
    setNewPlayerName('')
  }

  const handleRemovePlayer = async (playerId: string) => {
    const updatedIds = currentTeam.playerIds.filter((id) => id !== playerId)
    const updatedTeam: TeamRecord = {
      ...currentTeam,
      playerIds: updatedIds,
      updatedAt: Date.now(),
    }
    await repository.saveTeam(updatedTeam)
    setCurrentTeam(updatedTeam)
  }

  const handleSaveTeamName = async () => {
    if (!teamName.trim()) return
    const updatedTeam: TeamRecord = {
      ...currentTeam,
      name: teamName.trim(),
      updatedAt: Date.now(),
    }
    await repository.saveTeam(updatedTeam)
    setCurrentTeam(updatedTeam)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col justify-between bg-[#080C0E] text-white p-4">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A262B] pb-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-[#121A1D] border border-slate-700 text-slate-300 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-black text-white">Edit Team Roster</h2>
          </div>

          <button
            type="button"
            onClick={handleSaveTeamName}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1 shadow"
          >
            {isSaved ? <Check size={14} /> : null}
            <span>{isSaved ? 'Saved' : 'Save Name'}</span>
          </button>
        </div>

        {/* Team Name Input */}
        <div>
          <label className="text-xs text-slate-400 font-semibold mb-1 block">
            Team Name:
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full h-12 bg-[#121A1D] border border-slate-700 rounded-xl px-3 text-base font-bold text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Add Player Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-400 font-semibold">
            Add Players (type name or paste comma list):
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleAddPlayer()
                }
              }}
              placeholder="e.g. Dhoni, Raina, Jadeja"
              className="flex-1 h-11 bg-[#121A1D] border border-slate-700 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleAddPlayer}
              className="px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1 shadow"
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Player Roster List */}
        <div className="flex flex-col gap-2 mt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Squad Players ({players.length})
          </span>

          {players.length === 0 ? (
            <div className="p-6 text-center bg-[#121A1D] border border-[#233238] rounded-xl text-slate-500 text-xs">
              No players added yet. Add squad members above.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  className="p-3 bg-[#121A1D] border border-[#233238] rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono text-slate-500 w-5">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-bold text-white">{p.name}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemovePlayer(p.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
