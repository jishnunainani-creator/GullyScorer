import type { VoiceCommand } from './types'
import type { WicketType } from '../engine/types'

/**
 * Pure function to parse voice speech recognition transcripts into structured Cricket VoiceCommands.
 * Handles noise, conversational fillers ("uh four", "that's a six"), Hindi/Hinglish terms
 * ("chhakka", "chauka", "ek", "do"), and standard cricket terms.
 */
export function parseVoiceCommand(rawTranscript: string): VoiceCommand | null {
  if (!rawTranscript || typeof rawTranscript !== 'string') {
    return null
  }

  const originalPhrase = rawTranscript.trim()
  // Clean transcript: lower-case, remove special punctuation, normalize whitespace
  const clean = originalPhrase
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!clean) {
    return null
  }

  // 1. Undo commands
  if (
    clean.includes('undo') ||
    clean.includes('cancel last') ||
    clean.includes('cancel') ||
    clean.includes('wapas') ||
    clean.includes('revert')
  ) {
    return { type: 'undo', originalPhrase }
  }

  // 2. Wicket / Out commands
  const wicketPatterns: Array<{ re: RegExp; type: WicketType }> = [
    { re: /\b(caught and bowled)\b/, type: 'caught' },
    { re: /\b(caught|catch|catches)\b/, type: 'caught' },
    { re: /\b(bowled|clean bowled)\b/, type: 'bowled' },
    { re: /\b(lbw|leg before)\b/, type: 'lbw' },
    { re: /\b(run out|runout)\b/, type: 'runout' },
    { re: /\b(stumped|stumping)\b/, type: 'stumped' },
    { re: /\b(hit wicket|hitwicket)\b/, type: 'hitwicket' },
    { re: /\b(out|wicket|gaya|chal gaya)\b/, type: 'bowled' },
  ]

  for (const wp of wicketPatterns) {
    if (wp.re.test(clean)) {
      return {
        type: 'wicket',
        wicketType: wp.type,
        originalPhrase,
      }
    }
  }

  // 3. Extras commands
  // Leg-bye check before bye
  if (/\b(leg bye|legbye|leg byes)\b/.test(clean)) {
    return {
      type: 'extra',
      extraType: 'legbye',
      runs: 1,
      originalPhrase,
    }
  }

  if (/\b(bye|byes)\b/.test(clean)) {
    return {
      type: 'extra',
      extraType: 'bye',
      runs: 1,
      originalPhrase,
    }
  }

  if (/\b(no ball|noball|no-ball)\b/.test(clean)) {
    return {
      type: 'extra',
      extraType: 'noball',
      runs: 1,
      originalPhrase,
    }
  }

  if (/\b(wide|wide ball|waid)\b/.test(clean)) {
    return {
      type: 'extra',
      extraType: 'wide',
      runs: 1,
      originalPhrase,
    }
  }

  // 4. Runs & Boundaries
  // Sixes
  if (
    /\b(six|sixer|maximum|chhakka|chakka|chhe|che|6)\b/.test(clean) ||
    clean === '6'
  ) {
    return {
      type: 'runs',
      runs: 6,
      isBoundary4: false,
      isBoundary6: true,
      originalPhrase,
    }
  }

  // Fours / Boundary
  if (
    /\b(four|boundary|chauka|chaar|char|4)\b/.test(clean) ||
    clean === '4'
  ) {
    return {
      type: 'runs',
      runs: 4,
      isBoundary4: true,
      isBoundary6: false,
      originalPhrase,
    }
  }

  // Five
  if (/\b(five|paanch|panch|5)\b/.test(clean) || clean === '5') {
    return {
      type: 'runs',
      runs: 5,
      isBoundary4: false,
      isBoundary6: false,
      originalPhrase,
    }
  }

  // Three
  if (/\b(three|teen|tiggi|3)\b/.test(clean) || clean === '3') {
    return {
      type: 'runs',
      runs: 3,
      isBoundary4: false,
      isBoundary6: false,
      originalPhrase,
    }
  }

  // Two / Double
  if (/\b(two|double|do|duggi|2)\b/.test(clean) || clean === '2') {
    return {
      type: 'runs',
      runs: 2,
      isBoundary4: false,
      isBoundary6: false,
      originalPhrase,
    }
  }

  // One / Single
  if (/\b(one|single|ek|1)\b/.test(clean) || clean === '1') {
    return {
      type: 'runs',
      runs: 1,
      isBoundary4: false,
      isBoundary6: false,
      originalPhrase,
    }
  }

  // Zero / Dot ball
  if (
    /\b(zero|dot|dot ball|no run|none|shunya|bindi|0)\b/.test(clean) ||
    clean === '0'
  ) {
    return {
      type: 'runs',
      runs: 0,
      isBoundary4: false,
      isBoundary6: false,
      originalPhrase,
    }
  }

  return null
}
