import { describe, it, expect, beforeEach } from 'vitest'
import { en } from '../locales/en'
import { hi } from '../locales/hi'
import { gu } from '../locales/gu'
import {
  t,
  setLanguage,
  getLanguage,
  getTranslation,
  SUPPORTED_LANGUAGES,
} from '../index'

describe('Multilingual i18n Subsystem', () => {
  beforeEach(() => {
    setLanguage('en')
  })

  it('maintains strict 1:1 key parity between en, hi, and gu dictionaries', () => {
    const enKeys = Object.keys(en).sort()
    const hiKeys = Object.keys(hi).sort()
    const guKeys = Object.keys(gu).sort()

    expect(hiKeys).toEqual(enKeys)
    expect(guKeys).toEqual(enKeys)
  })

  it('translates gully rules terms in all 3 languages', () => {
    expect(getTranslation('en', 'oneTipOneHand')).toBe('One Tip One Hand')
    expect(getTranslation('hi', 'oneTipOneHand')).toBe('एक टप्पा एक हाथ')
    expect(getTranslation('gu', 'oneTipOneHand')).toBe('એક ટીપ એક હાથ')

    expect(getTranslation('en', 'mankad')).toBe('Mankad (Run Out)')
    expect(getTranslation('hi', 'mankad')).toBe('मांकड़ (रन आउट)')
    expect(getTranslation('gu', 'mankad')).toBe('માંકડ (રન આઉટ)')
  })

  it('switches current language dynamically', () => {
    expect(getLanguage()).toBe('en')
    expect(t('runs')).toBe('Runs')

    setLanguage('hi')
    expect(getLanguage()).toBe('hi')
    expect(t('runs')).toBe('रन')

    setLanguage('gu')
    expect(getLanguage()).toBe('gu')
    expect(t('runs')).toBe('રન')
  })

  it('has valid supported languages list', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(3)
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toEqual(['en', 'hi', 'gu'])
  })
})
