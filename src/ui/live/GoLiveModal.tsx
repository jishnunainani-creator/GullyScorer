import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { X, Radio, Copy, Check, Share2, RefreshCw } from 'lucide-react'
import { generateShareToken } from '../../live/token'

interface GoLiveModalProps {
  isLive: boolean
  shareToken?: string
  teamAName: string
  teamBName: string
  onToggleLive: (active: boolean, token?: string) => Promise<void>
  onRegenerateToken: () => Promise<void>
  onClose: () => void
}

export const GoLiveModal: React.FC<GoLiveModalProps> = ({
  isLive,
  shareToken,
  teamAName,
  teamBName,
  onToggleLive,
  onRegenerateToken,
  onClose,
}) => {
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const liveUrl = shareToken
    ? `${window.location.origin}/live/${shareToken}`
    : ''

  useEffect(() => {
    if (liveUrl) {
      QRCode.toDataURL(liveUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(''))
    }
  }, [liveUrl])

  const handleToggle = async () => {
    setLoading(true)
    try {
      if (!isLive) {
        const token = shareToken || generateShareToken()
        await onToggleLive(true, token)
      } else {
        await onToggleLive(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!liveUrl) return
    try {
      await navigator.clipboard.writeText(liveUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore
    }
  }

  const handleWhatsAppShare = () => {
    if (!liveUrl) return
    const text = `🏏 Watch *${teamAName}* vs *${teamBName}* LIVE ball-by-ball on PitchLog!\n\nTap here to watch live: ${liveUrl}`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-sm bg-[#121A1D] border border-[#233238] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#233238] pb-3">
          <div className="flex items-center gap-2">
            <Radio size={20} className={isLive ? 'text-rose-500 animate-pulse' : 'text-slate-400'} />
            <h3 className="text-base font-bold text-white">Go Live Match Link</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Toggle Pill */}
        <div className="flex items-center justify-between p-3.5 bg-[#182328] rounded-xl border border-slate-700">
          <div>
            <p className="text-sm font-bold text-white">
              {isLive ? 'Live Stream Active' : 'Broadcast Offline'}
            </p>
            <p className="text-xs text-slate-400">
              {isLive ? 'Friends can watch ball-by-ball' : 'Enable link to broadcast live score'}
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleToggle}
            className={`w-12 h-7 rounded-full p-1 transition-colors ${
              isLive ? 'bg-rose-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                isLive ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {isLive && shareToken && (
          <div className="flex flex-col gap-3">
            {/* QR Code Container */}
            {qrDataUrl && (
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-md">
                <img src={qrDataUrl} alt="Live Score QR Code" className="w-44 h-44 object-contain" />
                <span className="text-[11px] font-mono font-bold text-black mt-1">
                  Scan to watch match live
                </span>
              </div>
            )}

            {/* Share Link input */}
            <div className="flex items-center gap-1.5 p-1.5 bg-[#0A0F11] border border-slate-700 rounded-xl">
              <input
                type="text"
                readOnly
                value={liveUrl}
                className="flex-1 bg-transparent px-2 text-xs font-mono text-emerald-400 focus:outline-none truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-lg flex items-center gap-1 transition-all"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
            >
              <Share2 size={16} />
              <span>Share Link on WhatsApp</span>
            </button>

            {/* Regenerate Token */}
            <button
              type="button"
              onClick={onRegenerateToken}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} />
              <span>Regenerate link (revokes previous link)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
