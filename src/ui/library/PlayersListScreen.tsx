import React, { useEffect, useState } from 'react'
import { ArrowLeft, Search, Plus, Trash2, User } from 'lucide-react'
import { repository } from '../../db/repository'
import type { PlayerRecord } from '../../db/schema'

interface PlayersListScreenProps {
  onBack: () => void
  onSelectPlayer?: (playerId: string) => void
}

export const PlayersListScreen: React.FC<PlayersListScreenProps> = ({ onBack, onSelectPlayer }) => {
  const [players, setPlayers] = useState<PlayerRecord[]>([])
  const [search, setSearch] = useState('')
  const [newPlayerName, setNewPlayerName] = useState('')
  const [loading, setLoading] = useState(true)

  const loadPlayers = async () => {
    try {
      setLoading(true)
      const list = await repository.listPlayers()
      setPlayers(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPlayers()
  }, [])

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return
    const pRecord: PlayerRecord = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: newPlayerName.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await repository.savePlayer(pRecord)
    setNewPlayerName('')
    await loadPlayers()
  }

  const handleDeletePlayer = async (id: string) => {
    await repository.deletePlayer(id)
    await loadPlayers()
  }

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  )

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
            <h2 className="text-lg font-black text-white">All Players</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {players.length} total
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players by name..."
            className="w-full h-11 bg-[#121A1D] border border-slate-700 rounded-xl pl-10 pr-3 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Quick Add */}
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
            placeholder="New player name..."
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

        {/* Players List */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-xs font-mono">
            Loading players...
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="p-8 text-center bg-[#121A1D] border border-[#233238] rounded-2xl flex flex-col items-center gap-2 text-slate-500 text-xs">
            <User size={32} className="text-slate-600 mb-1" />
            <p className="font-semibold text-slate-400">No players found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1">
            {filteredPlayers.map((p) => (
              <div
                key={p.id}
                className="p-3 bg-[#121A1D] hover:bg-[#182328] border border-[#233238] hover:border-slate-700 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                onClick={() => onSelectPlayer?.(p.id)}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">{p.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {p.leftHanded ? 'Left Hand' : 'Right Hand'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleDeletePlayer(p.id)
                  }}
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
  )
}
