import { describe, it, expect } from 'vitest'
import {
  ANIMAL_MASCOTS,
  IPL_FRANCHISES,
  COUNTRY_TEAMS,
  getMascot,
  getFranchiseTheme,
  getCountryTheme,
  resolveAvatarColors,
} from '../catalog'

describe('Team Identity & Avatar Catalog', () => {
  it('contains exactly 14 animal mascots with valid svg paths and colors', () => {
    expect(ANIMAL_MASCOTS).toHaveLength(14)
    for (const mascot of ANIMAL_MASCOTS) {
      expect(mascot.key).toBeTruthy()
      expect(mascot.displayName).toBeTruthy()
      expect(mascot.category).toBe('ANIMAL')
      expect(mascot.defaultPrimaryColor).toMatch(/^#[0-9a-f]{6}$/i)
      expect(mascot.svgPath.length).toBeGreaterThan(10)
    }
  })

  it('contains 10 IPL franchise themes with valid colors and symbols', () => {
    expect(IPL_FRANCHISES).toHaveLength(10)
    for (const franchise of IPL_FRANCHISES) {
      expect(franchise.key).toBeTruthy()
      expect(franchise.franchiseCity).toBeTruthy()
      expect(franchise.category).toBe('IPL')
      expect(franchise.primaryColor).toMatch(/^#[0-9a-f]{6}$/i)
      expect(franchise.symbol).toBeTruthy()
    }
  })

  it('contains 10 Country teams with flag emojis and ISO codes', () => {
    expect(COUNTRY_TEAMS).toHaveLength(10)
    for (const country of COUNTRY_TEAMS) {
      expect(country.key).toBeTruthy()
      expect(country.code).toHaveLength(country.code.length)
      expect(country.flagEmoji).toBeTruthy()
    }
  })

  it('retrieves mascots, franchises, and countries by key', () => {
    expect(getMascot('tiger')?.displayName).toBe('Royal Tigers')
    expect(getMascot('nonexistent')).toBeUndefined()

    expect(getFranchiseTheme('chennai')?.franchiseCity).toBe('Chennai')
    expect(getCountryTheme('india')?.countryName).toBe('India')
  })

  it('resolves colors with fallbacks', () => {
    // Default fallback
    const defaultColors = resolveAvatarColors(undefined)
    expect(defaultColors.primary).toBe('#10b981')

    // Mascot resolution
    const tigerColors = resolveAvatarColors({
      category: 'ANIMAL',
      assetKey: 'tiger',
      primaryColor: '',
    })
    expect(tigerColors.primary).toBe('#ea580c')

    // Explicit custom color overrides
    const customColors = resolveAvatarColors({
      category: 'CUSTOM',
      assetKey: '',
      primaryColor: '#ff0055',
      secondaryColor: '#00ffff',
    })
    expect(customColors.primary).toBe('#ff0055')
    expect(customColors.secondary).toBe('#00ffff')
  })
})
