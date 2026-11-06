export type TeamAvatarCategory = 'ANIMAL' | 'IPL' | 'COUNTRY' | 'CUSTOM' | 'INITIALS'

export interface TeamAvatarConfig {
  category: TeamAvatarCategory
  assetKey: string
  primaryColor: string
  secondaryColor?: string
  customInitials?: string
}

export interface MascotMetadata {
  key: string
  displayName: string
  category: TeamAvatarCategory
  defaultPrimaryColor: string
  defaultSecondaryColor: string
  /**
   * SVG path or vector definition for the mascot graphic.
   * Scaled for a 24x24 or 32x32 viewBox.
   */
  svgPath: string
}

export interface FranchiseThemeMetadata {
  key: string
  franchiseCity: string
  displayName: string
  category: 'IPL'
  primaryColor: string
  secondaryColor: string
  symbol: string
  svgPath: string
}

export interface CountryThemeMetadata {
  key: string
  countryName: string
  code: string
  category: 'COUNTRY'
  primaryColor: string
  secondaryColor: string
  flagEmoji: string
}
