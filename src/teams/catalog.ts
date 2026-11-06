import type {
  MascotMetadata,
  FranchiseThemeMetadata,
  CountryThemeMetadata,
  TeamAvatarConfig,
} from './types'

export const ANIMAL_MASCOTS: MascotMetadata[] = [
  {
    key: 'tiger',
    displayName: 'Royal Tigers',
    category: 'ANIMAL',
    defaultPrimaryColor: '#ea580c', // Orange-600
    defaultSecondaryColor: '#18181b', // Zinc-900
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  },
  {
    key: 'lion',
    displayName: 'Roaring Lions',
    category: 'ANIMAL',
    defaultPrimaryColor: '#eab308', // Yellow-500
    defaultSecondaryColor: '#78350f', // Amber-900
    svgPath: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5a3.5 3.5 0 1 1 3.5-3.5 3.5 3.5 0 0 1-3.5 3.5zM6 10a2 2 0 1 1 2-2 2 2 0 0 1-2 2zm12 0a2 2 0 1 1 2-2 2 2 0 0 1-2 2z',
  },
  {
    key: 'panther',
    displayName: 'Black Panthers',
    category: 'ANIMAL',
    defaultPrimaryColor: '#09090b', // Zinc-950
    defaultSecondaryColor: '#8b5cf6', // Violet-500
    svgPath: 'M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19H7v-1.5c1.47.95 3.2 1.5 5 1.5s3.53-.55 5-1.5V19h2.65l-.62-1.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9zm-3 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  },
  {
    key: 'cobra',
    displayName: 'Striking Cobras',
    category: 'ANIMAL',
    defaultPrimaryColor: '#15803d', // Green-700
    defaultSecondaryColor: '#ca8a04', // Yellow-600
    svgPath: 'M12 2C8 2 5 5 5 9c0 3 2 5.5 4 7v4h6v-4c2-1.5 4-4 4-7 0-4-3-7-7-7zm-2 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z',
  },
  {
    key: 'falcon',
    displayName: 'Swift Falcons',
    category: 'ANIMAL',
    defaultPrimaryColor: '#0284c7', // Sky-600
    defaultSecondaryColor: '#f97316', // Orange-500
    svgPath: 'M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z',
  },
  {
    key: 'rhino',
    displayName: 'Mighty Rhinos',
    category: 'ANIMAL',
    defaultPrimaryColor: '#64748b', // Slate-500
    defaultSecondaryColor: '#0f172a', // Slate-900
    svgPath: 'M19 8l-4-4H9L5 8v6l3 4h8l3-4V8zm-7 8a4 4 0 1 1 4-4 4 4 0 0 1-4 4z',
  },
  {
    key: 'bull',
    displayName: 'Raging Bulls',
    category: 'ANIMAL',
    defaultPrimaryColor: '#dc2626', // Red-600
    defaultSecondaryColor: '#171717', // Neutral-900
    svgPath: 'M7 3l3 4H5L2 3h5zm10 0l3 4h-5l3-4h-1zm-5 5c-3.86 0-7 3.14-7 7s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7z',
  },
  {
    key: 'wolf',
    displayName: 'Lone Wolves',
    category: 'ANIMAL',
    defaultPrimaryColor: '#475569', // Slate-600
    defaultSecondaryColor: '#38bdf8', // Sky-400
    svgPath: 'M12 2l-5 5v5l5 10 5-10V7l-5-5zm-2 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z',
  },
  {
    key: 'eagle',
    displayName: 'Soaring Eagles',
    category: 'ANIMAL',
    defaultPrimaryColor: '#b45309', // Amber-700
    defaultSecondaryColor: '#fef08a', // Yellow-200
    svgPath: 'M12 2L4 9l8 3 8-3-8-7zm0 10l-6 3 6 7 6-7-6-3z',
  },
  {
    key: 'shark',
    displayName: 'Apex Sharks',
    category: 'ANIMAL',
    defaultPrimaryColor: '#0369a1', // Sky-700
    defaultSecondaryColor: '#94a3b8', // Slate-400
    svgPath: 'M12 2a10 10 0 0 0-9.95 9h5.12L12 6.17 16.83 11h5.12A10 10 0 0 0 12 2zm-8 11a10 10 0 0 0 16 0H4z',
  },
  {
    key: 'elephant',
    displayName: 'Tuskers',
    category: 'ANIMAL',
    defaultPrimaryColor: '#52525b', // Zinc-600
    defaultSecondaryColor: '#e4e4e7', // Zinc-200
    svgPath: 'M12 4C7.58 4 4 7.58 4 12v6h4v-3c0-.55.45-1 1-1s1 .45 1 1v3h4v-6c0-2.21-1.79-4-4-4V4zm6 4c-1.1 0-2 .9-2 2v6h4v-6c0-1.1-.9-2-2-2z',
  },
  {
    key: 'cheetah',
    displayName: 'Speed Cheetahs',
    category: 'ANIMAL',
    defaultPrimaryColor: '#d97706', // Amber-600
    defaultSecondaryColor: '#1c1917', // Stone-900
    svgPath: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z',
  },
  {
    key: 'stallion',
    displayName: 'Thunder Stallions',
    category: 'ANIMAL',
    defaultPrimaryColor: '#7c2d12', // Orange-900
    defaultSecondaryColor: '#fbbf24', // Amber-400
    svgPath: 'M20 11V7l-4-4h-5L7 7v4l4 2v7l4-2v-5l5-2z',
  },
  {
    key: 'bear',
    displayName: 'Grizzly Bears',
    category: 'ANIMAL',
    defaultPrimaryColor: '#451a03', // Amber-950
    defaultSecondaryColor: '#f59e0b', // Amber-500
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z',
  },
]

export const IPL_FRANCHISES: FranchiseThemeMetadata[] = [
  {
    key: 'chennai',
    franchiseCity: 'Chennai',
    displayName: 'Chennai Whistlers',
    category: 'IPL',
    primaryColor: '#facc15', // Gold
    secondaryColor: '#1d4ed8', // Royal Blue
    symbol: '🦁',
    svgPath: 'M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm4 11H8v-1c0-1.33 2.67-2 4-2s4 .67 4 2v1z',
  },
  {
    key: 'mumbai',
    franchiseCity: 'Mumbai',
    displayName: 'Mumbai Paltan',
    category: 'IPL',
    primaryColor: '#004ba0', // Deep Blue
    secondaryColor: '#d4af37', // Gold
    symbol: '🌀',
    svgPath: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 17.93V18a3 3 0 0 1-3-3v-1H8v-2h2V9a3 3 0 0 1 3-3V4.07A8 8 0 0 1 19.93 12a8 8 0 0 1-6.93 7.93z',
  },
  {
    key: 'bengaluru',
    franchiseCity: 'Bengaluru',
    displayName: 'Royal Bengaluru',
    category: 'IPL',
    primaryColor: '#dc2626', // Red
    secondaryColor: '#000000', // Black
    symbol: '👑',
    svgPath: 'M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h14v1z',
  },
  {
    key: 'kolkata',
    franchiseCity: 'Kolkata',
    displayName: 'Kolkata Riders',
    category: 'IPL',
    primaryColor: '#3b0764', // Purple-950
    secondaryColor: '#f59e0b', // Gold
    symbol: '⚔️',
    svgPath: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 3-5 3-5-3 5-3zm-6 7.5V7.8l6 3.6 6-3.6v4.7c0 4.1-2.6 7.8-6 8.8-3.4-1-6-4.7-6-8.8z',
  },
  {
    key: 'delhi',
    franchiseCity: 'Delhi',
    displayName: 'Delhi Roarers',
    category: 'IPL',
    primaryColor: '#1e40af', // Blue-800
    secondaryColor: '#ef4444', // Red-500
    symbol: '🐯',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h2v2h-2v-2zm0-10h2v8h-2V6z',
  },
  {
    key: 'hyderabad',
    franchiseCity: 'Hyderabad',
    displayName: 'Orange Army Hyderabad',
    category: 'IPL',
    primaryColor: '#ea580c', // Orange-600
    secondaryColor: '#000000', // Black
    symbol: '🦅',
    svgPath: 'M12 7c-2.76 0-5 2.24-5 5 0 .65.13 1.26.36 1.83l2.92-2.92a1 1 0 0 1 1.41 0l1.42 1.41a1 1 0 0 1 0 1.42l-2.92 2.92c.57.23 1.18.36 1.83.36 2.76 0 5-2.24 5-5s-2.24-5-5-5zM12 2L2 12h3v8h14v-8h3L12 2z',
  },
  {
    key: 'rajasthan',
    franchiseCity: 'Rajasthan',
    displayName: 'Pink Royals',
    category: 'IPL',
    primaryColor: '#db2777', // Pink-600
    secondaryColor: '#1e3a8a', // Blue-900
    symbol: '🛡️',
    svgPath: 'M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z',
  },
  {
    key: 'punjab',
    franchiseCity: 'Punjab',
    displayName: 'Punjab Kingsmen',
    category: 'IPL',
    primaryColor: '#b91c1c', // Red-700
    secondaryColor: '#d1d5db', // Silver
    symbol: '🦁',
    svgPath: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm-2 15l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
  },
  {
    key: 'lucknow',
    franchiseCity: 'Lucknow',
    displayName: 'Lucknow Giants',
    category: 'IPL',
    primaryColor: '#06b6d4', // Cyan-500
    secondaryColor: '#1e3a8a', // Dark Navy
    symbol: '⚡',
    svgPath: 'M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-6 10.49z',
  },
  {
    key: 'gujarat',
    franchiseCity: 'Gujarat',
    displayName: 'Gujarat Titans',
    category: 'IPL',
    primaryColor: '#0f172a', // Navy / Slate-900
    secondaryColor: '#eab308', // Gold
    symbol: '🔱',
    svgPath: 'M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-4.5-6.5 4.5 2-7.5L3 9h7l2-7z',
  },
]

export const COUNTRY_TEAMS: CountryThemeMetadata[] = [
  {
    key: 'india',
    countryName: 'India',
    code: 'IND',
    category: 'COUNTRY',
    primaryColor: '#0284c7', // Sky blue
    secondaryColor: '#ea580c', // Saffron
    flagEmoji: '🇮🇳',
  },
  {
    key: 'australia',
    countryName: 'Australia',
    code: 'AUS',
    category: 'COUNTRY',
    primaryColor: '#eab308', // Gold
    secondaryColor: '#15803d', // Green
    flagEmoji: '🇦🇺',
  },
  {
    key: 'england',
    countryName: 'England',
    code: 'ENG',
    category: 'COUNTRY',
    primaryColor: '#1e3a8a', // Navy
    secondaryColor: '#dc2626', // Red
    flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  },
  {
    key: 'pakistan',
    countryName: 'Pakistan',
    code: 'PAK',
    category: 'COUNTRY',
    primaryColor: '#166534', // Dark green
    secondaryColor: '#eab308', // Gold
    flagEmoji: '🇵🇰',
  },
  {
    key: 'south_africa',
    countryName: 'South Africa',
    code: 'SA',
    category: 'COUNTRY',
    primaryColor: '#15803d', // Green
    secondaryColor: '#ca8a04', // Gold
    flagEmoji: '🇿🇦',
  },
  {
    key: 'new_zealand',
    countryName: 'New Zealand',
    code: 'NZ',
    category: 'COUNTRY',
    primaryColor: '#09090b', // Black
    secondaryColor: '#e2e8f0', // Silver
    flagEmoji: '🇳🇿',
  },
  {
    key: 'west_indies',
    countryName: 'West Indies',
    code: 'WI',
    category: 'COUNTRY',
    primaryColor: '#881337', // Maroon
    secondaryColor: '#eab308', // Yellow
    flagEmoji: '🏝️',
  },
  {
    key: 'sri_lanka',
    countryName: 'Sri Lanka',
    code: 'SL',
    category: 'COUNTRY',
    primaryColor: '#1d4ed8', // Blue
    secondaryColor: '#eab308', // Yellow
    flagEmoji: '🇱🇰',
  },
  {
    key: 'afghanistan',
    countryName: 'Afghanistan',
    code: 'AFG',
    category: 'COUNTRY',
    primaryColor: '#2563eb', // Blue
    secondaryColor: '#dc2626', // Red
    flagEmoji: '🇦🇫',
  },
  {
    key: 'bangladesh',
    countryName: 'Bangladesh',
    code: 'BAN',
    category: 'COUNTRY',
    primaryColor: '#15803d', // Green
    secondaryColor: '#dc2626', // Red
    flagEmoji: '🇧🇩',
  },
]

export function getMascot(key: string): MascotMetadata | undefined {
  return ANIMAL_MASCOTS.find((m) => m.key === key)
}

export function getFranchiseTheme(key: string): FranchiseThemeMetadata | undefined {
  return IPL_FRANCHISES.find((f) => f.key === key)
}

export function getCountryTheme(key: string): CountryThemeMetadata | undefined {
  return COUNTRY_TEAMS.find((c) => c.key === key)
}

export function resolveAvatarColors(config?: TeamAvatarConfig): {
  primary: string
  secondary: string
} {
  if (!config) {
    return { primary: '#10b981', secondary: '#047857' } // emerald default
  }

  if (config.primaryColor) {
    return {
      primary: config.primaryColor,
      secondary: config.secondaryColor || '#09090b',
    }
  }

  if (config.category === 'ANIMAL') {
    const mascot = getMascot(config.assetKey)
    if (mascot) {
      return {
        primary: mascot.defaultPrimaryColor,
        secondary: mascot.defaultSecondaryColor,
      }
    }
  }

  if (config.category === 'IPL') {
    const franchise = getFranchiseTheme(config.assetKey)
    if (franchise) {
      return {
        primary: franchise.primaryColor,
        secondary: franchise.secondaryColor,
      }
    }
  }

  if (config.category === 'COUNTRY') {
    const country = getCountryTheme(config.assetKey)
    if (country) {
      return {
        primary: country.primaryColor,
        secondary: country.secondaryColor,
      }
    }
  }

  return { primary: '#10b981', secondary: '#047857' }
}
