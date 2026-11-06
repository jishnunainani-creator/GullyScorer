import React, { useState } from 'react'
import { X, Check, Sparkles, Shield, Flag, Palette } from 'lucide-react'
import type { TeamAvatarConfig, TeamAvatarCategory } from '../../teams/types'
import {
  ANIMAL_MASCOTS,
  IPL_FRANCHISES,
  COUNTRY_TEAMS,
} from '../../teams/catalog'
import { TeamAvatarRenderer } from '../../teams/TeamAvatarRenderer'
import { useTranslation } from '../../i18n'

interface TeamAvatarPickerModalProps {
  teamName: string
  currentAvatar?: TeamAvatarConfig | null
  isOpen: boolean
  onClose: () => void
  onSelect: (avatar: TeamAvatarConfig) => void
}

const PRESET_COLORS = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#84cc16', // lime
  '#64748b', // slate
  '#18181b', // zinc
]

export const TeamAvatarPickerModal: React.FC<TeamAvatarPickerModalProps> = ({
  teamName,
  currentAvatar,
  isOpen,
  onClose,
  onSelect,
}) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TeamAvatarCategory>(
    currentAvatar?.category || 'ANIMAL',
  )
  const [selectedAssetKey, setSelectedAssetKey] = useState<string>(
    currentAvatar?.assetKey || ANIMAL_MASCOTS[0]?.key || 'tiger',
  )
  const [customPrimary, setCustomPrimary] = useState<string>(
    currentAvatar?.primaryColor || '#10b981',
  )
  const [customSecondary, setCustomSecondary] = useState<string>(
    currentAvatar?.secondaryColor || '#047857',
  )
  const [customInitials, setCustomInitials] = useState<string>(
    currentAvatar?.customInitials || '',
  )

  if (!isOpen) return null

  const handleApply = () => {
    let finalConfig: TeamAvatarConfig

    if (activeTab === 'ANIMAL') {
      const mascot = ANIMAL_MASCOTS.find((m) => m.key === selectedAssetKey)
      finalConfig = {
        category: 'ANIMAL',
        assetKey: selectedAssetKey,
        primaryColor: mascot?.defaultPrimaryColor || customPrimary,
        secondaryColor: mascot?.defaultSecondaryColor || customSecondary,
      }
    } else if (activeTab === 'IPL') {
      const franchise = IPL_FRANCHISES.find((f) => f.key === selectedAssetKey)
      finalConfig = {
        category: 'IPL',
        assetKey: selectedAssetKey,
        primaryColor: franchise?.primaryColor || customPrimary,
        secondaryColor: franchise?.secondaryColor || customSecondary,
      }
    } else if (activeTab === 'COUNTRY') {
      const country = COUNTRY_TEAMS.find((c) => c.key === selectedAssetKey)
      finalConfig = {
        category: 'COUNTRY',
        assetKey: selectedAssetKey,
        primaryColor: country?.primaryColor || customPrimary,
        secondaryColor: country?.secondaryColor || customSecondary,
      }
    } else {
      finalConfig = {
        category: 'INITIALS',
        assetKey: 'initials',
        primaryColor: customPrimary,
        secondaryColor: customSecondary,
        customInitials: customInitials.trim() || undefined,
      }
    }

    onSelect(finalConfig)
    onClose()
  }

  // Current preview config
  const previewConfig: TeamAvatarConfig = {
    category: activeTab,
    assetKey: selectedAssetKey,
    primaryColor: customPrimary,
    secondaryColor: customSecondary,
    customInitials: customInitials.trim() || undefined,
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-md bg-[#0F1619] border border-slate-800 rounded-2xl p-5 shadow-2xl text-white max-h-[90vh] flex flex-col justify-between">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 id="avatar-picker-title" className="font-bold text-base text-white">
              {t('chooseAvatar')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('close')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
            >
              <X size={18} />
            </button>
          </div>

          {/* Live Preview Box */}
          <div className="my-3 p-3 rounded-xl bg-[#172227] border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TeamAvatarRenderer
                avatar={previewConfig}
                teamName={teamName}
                size="lg"
              />
              <div>
                <div className="text-sm font-bold text-white">{teamName}</div>
                <div className="text-[11px] text-slate-400">
                  Category:{' '}
                  <span className="text-emerald-400 font-semibold uppercase">
                    {activeTab}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">Live Preview</div>
          </div>

          {/* Category Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-[#121A1D] rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('ANIMAL')
                if (!ANIMAL_MASCOTS.some((m) => m.key === selectedAssetKey)) {
                  setSelectedAssetKey(ANIMAL_MASCOTS[0]?.key || 'tiger')
                }
              }}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                activeTab === 'ANIMAL'
                  ? 'bg-emerald-500 text-black shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={12} />
              <span>Animals</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('IPL')
                if (!IPL_FRANCHISES.some((f) => f.key === selectedAssetKey)) {
                  setSelectedAssetKey(IPL_FRANCHISES[0]?.key || 'chennai')
                }
              }}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                activeTab === 'IPL'
                  ? 'bg-emerald-500 text-black shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield size={12} />
              <span>IPL</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('COUNTRY')
                if (!COUNTRY_TEAMS.some((c) => c.key === selectedAssetKey)) {
                  setSelectedAssetKey(COUNTRY_TEAMS[0]?.key || 'india')
                }
              }}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                activeTab === 'COUNTRY'
                  ? 'bg-emerald-500 text-black shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flag size={12} />
              <span>Flags</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('INITIALS')}
              className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                activeTab === 'INITIALS'
                  ? 'bg-emerald-500 text-black shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Palette size={12} />
              <span>Initials</span>
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="my-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
          {activeTab === 'ANIMAL' && (
            <div className="grid grid-cols-2 gap-2">
              {ANIMAL_MASCOTS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setSelectedAssetKey(m.key)
                    setCustomPrimary(m.defaultPrimaryColor)
                    setCustomSecondary(m.defaultSecondaryColor)
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                    selectedAssetKey === m.key
                      ? 'bg-emerald-500/20 border-emerald-500 text-white'
                      : 'bg-[#172227] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <TeamAvatarRenderer
                    avatar={{
                      category: 'ANIMAL',
                      assetKey: m.key,
                      primaryColor: m.defaultPrimaryColor,
                      secondaryColor: m.defaultSecondaryColor,
                    }}
                    teamName={m.displayName}
                    size="sm"
                  />
                  <div className="text-xs font-semibold truncate">
                    {m.displayName}
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'IPL' && (
            <div className="grid grid-cols-2 gap-2">
              {IPL_FRANCHISES.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setSelectedAssetKey(f.key)
                    setCustomPrimary(f.primaryColor)
                    setCustomSecondary(f.secondaryColor)
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                    selectedAssetKey === f.key
                      ? 'bg-emerald-500/20 border-emerald-500 text-white'
                      : 'bg-[#172227] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <TeamAvatarRenderer
                    avatar={{
                      category: 'IPL',
                      assetKey: f.key,
                      primaryColor: f.primaryColor,
                      secondaryColor: f.secondaryColor,
                    }}
                    teamName={f.displayName}
                    size="sm"
                  />
                  <div className="text-xs font-semibold truncate">
                    {f.displayName}
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'COUNTRY' && (
            <div className="grid grid-cols-2 gap-2">
              {COUNTRY_TEAMS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    setSelectedAssetKey(c.key)
                    setCustomPrimary(c.primaryColor)
                    setCustomSecondary(c.secondaryColor)
                  }}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                    selectedAssetKey === c.key
                      ? 'bg-emerald-500/20 border-emerald-500 text-white'
                      : 'bg-[#172227] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <TeamAvatarRenderer
                    avatar={{
                      category: 'COUNTRY',
                      assetKey: c.key,
                      primaryColor: c.primaryColor,
                      secondaryColor: c.secondaryColor,
                    }}
                    teamName={c.countryName}
                    size="sm"
                  />
                  <div className="text-xs font-semibold truncate">
                    {c.countryName} ({c.code})
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'INITIALS' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Custom Initials (Optional, max 3 letters)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={customInitials}
                  onChange={(e) => setCustomInitials(e.target.value.toUpperCase())}
                  placeholder="e.g. MI"
                  className="w-full px-3 py-2 bg-[#172227] border border-slate-700 rounded-xl text-sm text-white uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Primary Theme Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCustomPrimary(c)}
                      className={`w-9 h-9 rounded-xl border-2 transition-transform ${
                        customPrimary === c
                          ? 'scale-110 border-white shadow-lg'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Border / Contrast Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCustomSecondary(c)}
                      className={`w-9 h-9 rounded-xl border-2 transition-transform ${
                        customSecondary === c
                          ? 'scale-110 border-white shadow-lg'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 transition-all shadow-md"
          >
            <Check size={14} />
            <span>Apply Avatar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
