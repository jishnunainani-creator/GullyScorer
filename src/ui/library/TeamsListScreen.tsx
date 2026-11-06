import React, { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Users, ChevronRight, Trash2 } from 'lucide-react'
import { repository } from '../../db/repository'
import type { TeamRecord } from '../../db/schema'

interface TeamsListScreenProps {
  onBack: () => void
  onSelectTeam: (team: TeamRecord) => void
}

export const TeamsListScreen: React.FC<TeamsListScreenProps> = ({
  onBack,
  onSelectTeam,
}) => {
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadTeams = async () => {
    try {
      setLoading(true)
      const list = await repository.listTeams()
      setTeams(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTeams()
  }, [])

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return
    const newTeam: TeamRecord = {
      id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: newTeamName.trim(),
      playerIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await repository.saveTeam(newTeam)
    setNewTeamName('')
    setShowAddModal(false)
    await loadTeams()
  }

  const handleDeleteTeam = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await repository.deleteTeam(id)
    await loadTeams()
  }

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col justify-between bg-[#080C0E] text-white p-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#1A262B] pb-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-[#121A1D] border border-slate-700 text-slate-300 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-black text-white">Teams Library</h2>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-xl flex items-center gap-1 shadow"
          >
            <Plus size={16} />
            <span>New Team</span>
          </button>
        </div>

        {/* List of Teams */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-xs font-mono">
            Loading teams...
          </div>
        ) : teams.length === 0 ? (
          <div className="p-8 text-center bg-[#121A1D] border border-[#233238] rounded-2xl flex flex-col items-center gap-2 text-slate-500 text-xs">
            <Users size={32} className="text-slate-600 mb-1" />
            <p className="font-semibold text-slate-400">No saved teams yet</p>
            <p>Create reusable teams and rosters to start matches in seconds!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {teams.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTeam(t)}
                className="p-4 bg-[#121A1D] hover:bg-[#182328] border border-[#233238] hover:border-emerald-500/50 rounded-xl cursor-pointer flex items-center justify-between transition-all active:scale-99 shadow-sm"
              >
                <div>
                  <h3 className="font-bold text-white text-sm">{t.name}</h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {t.playerIds.length} players in roster
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleDeleteTeam(e, t.id)}
                    className="p-2 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronRight size={18} className="text-slate-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121A1D] border border-[#233238] rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-base font-bold text-white">Create New Team</h3>
            <input
              type="text"
              autoFocus
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. Royal Challengers"
              className="w-full h-12 bg-[#0A0F11] border border-slate-700 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="h-11 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTeam}
                disabled={!newTeamName.trim()}
                className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-extrabold text-xs shadow"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
