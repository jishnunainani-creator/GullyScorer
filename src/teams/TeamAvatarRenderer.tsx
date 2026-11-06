import React from 'react'
import type { TeamAvatarConfig } from './types'
import {
  getMascot,
  getFranchiseTheme,
  getCountryTheme,
  resolveAvatarColors,
} from './catalog'

export interface TeamAvatarProps {
  avatar?: TeamAvatarConfig | null
  teamName: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  className?: string
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return 'GC'
  const parts = name.trim().split(/\s+/)
  const first = parts[0] || 'G'
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase()
  }
  const second = parts[1] || ''
  return ((first[0] || 'G') + (second[0] || '')).toUpperCase()
}

const SIZE_MAP = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
}

export const TeamAvatarRenderer: React.FC<TeamAvatarProps> = ({
  avatar,
  teamName,
  size = 'md',
  className = '',
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 40
  const colors = resolveAvatarColors(avatar || undefined)
  const category = avatar?.category || 'INITIALS'
  const assetKey = avatar?.assetKey || ''
  const initials = avatar?.customInitials || getInitials(teamName)

  // Style container
  const containerStyle: React.CSSProperties = {
    width: `${pixelSize}px`,
    height: `${pixelSize}px`,
    backgroundColor: colors.primary,
    borderColor: colors.secondary,
  }

  // Animal mascot rendering
  if (category === 'ANIMAL') {
    const mascot = getMascot(assetKey)
    if (mascot) {
      return (
        <div
          data-testid="team-avatar-animal"
          role="img"
          aria-label={`${teamName} (${mascot.displayName})`}
          className={`relative rounded-full flex items-center justify-center border-2 shadow-sm overflow-hidden flex-shrink-0 ${className}`}
          style={containerStyle}
        >
          <svg
            viewBox="0 0 24 24"
            width={pixelSize * 0.6}
            height={pixelSize * 0.6}
            fill={colors.secondary || '#ffffff'}
            className="transition-transform duration-200"
          >
            <path d={mascot.svgPath} />
          </svg>
        </div>
      )
    }
  }

  // IPL Franchise rendering
  if (category === 'IPL') {
    const franchise = getFranchiseTheme(assetKey)
    if (franchise) {
      return (
        <div
          data-testid="team-avatar-ipl"
          role="img"
          aria-label={`${teamName} (${franchise.displayName})`}
          className={`relative rounded-full flex items-center justify-center border-2 shadow-sm overflow-hidden flex-shrink-0 ${className}`}
          style={containerStyle}
        >
          <svg
            viewBox="0 0 24 24"
            width={pixelSize * 0.6}
            height={pixelSize * 0.6}
            fill={colors.secondary || '#ffffff'}
          >
            <path d={franchise.svgPath} />
          </svg>
        </div>
      )
    }
  }

  // Country Theme rendering
  if (category === 'COUNTRY') {
    const country = getCountryTheme(assetKey)
    if (country) {
      return (
        <div
          data-testid="team-avatar-country"
          role="img"
          aria-label={`${teamName} (${country.countryName})`}
          className={`relative rounded-full flex items-center justify-center border-2 shadow-sm overflow-hidden flex-shrink-0 ${className}`}
          style={containerStyle}
        >
          <span
            style={{ fontSize: `${pixelSize * 0.5}px` }}
            className="select-none leading-none"
          >
            {country.flagEmoji}
          </span>
        </div>
      )
    }
  }

  // Initials or Custom fallback
  return (
    <div
      data-testid="team-avatar-initials"
      role="img"
      aria-label={teamName}
      className={`relative rounded-full flex items-center justify-center border-2 shadow-sm overflow-hidden flex-shrink-0 text-white font-bold select-none ${className}`}
      style={containerStyle}
    >
      <span
        style={{
          fontSize: `${Math.max(10, Math.floor(pixelSize * 0.38))}px`,
          letterSpacing: '-0.5px',
        }}
      >
        {initials}
      </span>
    </div>
  )
}
