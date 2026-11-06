import { useState, useEffect } from 'react'
import type { LanguageCode, Translations } from './types'
import { SUPPORTED_LANGUAGES } from './types'
import { en } from './locales/en'
import { hi } from './locales/hi'
import { gu } from './locales/gu'

const DICTIONARIES: Record<LanguageCode, Translations> = {
  en,
  hi,
  gu,
}

const STORAGE_KEY = 'pitchlog_language'

let currentLang: LanguageCode = 'en'
const listeners = new Set<(lang: LanguageCode) => void>()

// Initialize from localStorage if in browser
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode
    if (saved && DICTIONARIES[saved]) {
      currentLang = saved
    }
  } catch {
    // ignore local storage security errors
  }
}

export function getLanguage(): LanguageCode {
  return currentLang
}

export function setLanguage(lang: LanguageCode): void {
  if (DICTIONARIES[lang]) {
    currentLang = lang
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore
    }
    listeners.forEach((listener) => listener(currentLang))
  }
}

export function t(key: keyof Translations): string {
  const dict = DICTIONARIES[currentLang] || en
  return dict[key] || en[key] || (key as string)
}

export function getTranslation(lang: LanguageCode, key: keyof Translations): string {
  const dict = DICTIONARIES[lang] || en
  return dict[key] || en[key] || (key as string)
}

export function useTranslation() {
  const [lang, setLang] = useState<LanguageCode>(currentLang)

  useEffect(() => {
    const listener = (newLang: LanguageCode) => setLang(newLang)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return {
    lang,
    setLanguage,
    t: (key: keyof Translations) => getTranslation(lang, key),
    supportedLanguages: SUPPORTED_LANGUAGES,
  }
}

export * from './types'
