import React, { useState } from 'react'
import { X, Check, User, Shield } from 'lucide-react'
import type { PlayerRecord, BattingStyle, BowlingStyle } from '../../db/schema'
import { repository } from '../../db/repository'
import { useTranslation } from '../../i18n'

interface EditPlayerModalProps {
  player: PlayerRecord
  isOpen: boolean
  onClose: () => void
  onSaved: (updated: PlayerRecord) => void
}

export const EditPlayerModal: React.FC<EditPlayerModalProps> = ({
  player,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation()
  const [name, setName] = useState(player.name)
  const [battingStyle, setBattingStyle] = useState<BattingStyle>(
    player.battingStyle || (player.leftHanded ? 'LEFT_HAND' : 'RIGHT_HAND'),
  )
  const [bowlingStyle, setBowlingStyle] = useState<BowlingStyle>(
    player.bowlingStyle || 'NONE',
  )
  const [jerseyNumber, setJerseyNumber] = useState<string>(
    player.jerseyNumber !== undefined ? String(player.jerseyNumber) : '',
  )
  const [avatarUrl, setAvatarUrl] = useState<string>(player.avatarUrl || '')
  const [phone, setPhone] = useState<string>(player.phone || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Player name cannot be empty')
      return
    }

    try {
      setSaving(true)
      setError(null)
      const parsedJersey = jerseyNumber.trim() ? parseInt(jerseyNumber, 10) : undefined

      const updates: Partial<PlayerRecord> = {
        name: name.trim(),
        leftHanded: battingStyle === 'LEFT_HAND',
        battingStyle,
        bowlingStyle,
        jerseyNumber: isNaN(Number(parsedJersey)) ? undefined : parsedJersey,
        avatarUrl: avatarUrl.trim() || undefined,
        phone: phone.trim() || undefined,
      }

      await repository.updatePlayerProfile(player.id, updates)
      onSaved({
        ...player,
        ...updates,
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update player')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-player-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-md bg-[#0F1619] border border-slate-800 rounded-2xl p-5 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <User className="text-emerald-400" size={20} />
            <h2 id="edit-player-title" className="font-bold text-lg text-white">
              {t('editPlayer')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Player Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Player Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Virat Kohli"
              required
              className="w-full px-3 py-2 bg-[#172227] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Batting Style */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('battingStyle')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBattingStyle('RIGHT_HAND')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  battingStyle === 'RIGHT_HAND'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-[#172227] border-slate-700/80 text-slate-400 hover:text-white'
                }`}
              >
                {t('rightHandBat')}
              </button>
              <button
                type="button"
                onClick={() => setBattingStyle('LEFT_HAND')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  battingStyle === 'LEFT_HAND'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                    : 'bg-[#172227] border-slate-700/80 text-slate-400 hover:text-white'
                }`}
              >
                {t('leftHandBat')}
              </button>
            </div>
          </div>

          {/* Bowling Style */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('bowlingStyle')}
            </label>
            <select
              value={bowlingStyle}
              onChange={(e) => setBowlingStyle(e.target.value as BowlingStyle)}
              className="w-full px-3 py-2 bg-[#172227] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="NONE">{t('noBowling')}</option>
              <option value="RIGHT_ARM_FAST">{t('rightArmFast')}</option>
              <option value="RIGHT_ARM_MEDIUM">{t('rightArmMedium')}</option>
              <option value="RIGHT_ARM_SPIN">{t('rightArmSpin')}</option>
              <option value="LEFT_ARM_FAST">{t('leftArmFast')}</option>
              <option value="LEFT_ARM_MEDIUM">{t('leftArmMedium')}</option>
              <option value="LEFT_ARM_SPIN">{t('leftArmSpin')}</option>
            </select>
          </div>

          {/* Jersey Number & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('jerseyNumber')}
              </label>
              <input
                type="number"
                min="0"
                max="999"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                placeholder="e.g. 18"
                className="w-full px-3 py-2 bg-[#172227] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91..."
                className="w-full px-3 py-2 bg-[#172227] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Avatar URL or Photo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Profile Photo URL (Optional)
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-[#172227] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Stable Identifier Note */}
          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Shield size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-semibold text-slate-300">Identity Guard:</span> Player ID is permanent ({player.id.slice(0, 8)}...). Editing name updates profiles without altering historical scorecards.
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Check size={14} />
              <span>{saving ? 'Saving...' : t('save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
