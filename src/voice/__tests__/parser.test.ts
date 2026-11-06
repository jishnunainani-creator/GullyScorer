import { describe, it, expect } from 'vitest'
import { parseVoiceCommand } from '../parser'

describe('parseVoiceCommand (Pure Speech Parser)', () => {
  it('parses zero and dot ball variants', () => {
    const p1 = parseVoiceCommand('zero')
    expect(p1?.type).toBe('runs')
    if (p1?.type === 'runs') expect(p1.runs).toBe(0)

    const p2 = parseVoiceCommand('dot')
    if (p2?.type === 'runs') expect(p2.runs).toBe(0)

    const p3 = parseVoiceCommand('dot ball')
    if (p3?.type === 'runs') expect(p3.runs).toBe(0)

    const p4 = parseVoiceCommand('no run')
    if (p4?.type === 'runs') expect(p4.runs).toBe(0)

    const p5 = parseVoiceCommand('shunya')
    if (p5?.type === 'runs') expect(p5.runs).toBe(0)
  })

  it('parses single runs and Hinglish ek', () => {
    const p1 = parseVoiceCommand('one')
    if (p1?.type === 'runs') expect(p1.runs).toBe(1)

    const p2 = parseVoiceCommand('single')
    if (p2?.type === 'runs') expect(p2.runs).toBe(1)

    const p3 = parseVoiceCommand('ek')
    if (p3?.type === 'runs') expect(p3.runs).toBe(1)

    const p4 = parseVoiceCommand('1')
    if (p4?.type === 'runs') expect(p4.runs).toBe(1)
  })

  it('parses double runs and Hinglish do', () => {
    const p1 = parseVoiceCommand('two')
    if (p1?.type === 'runs') expect(p1.runs).toBe(2)

    const p2 = parseVoiceCommand('double')
    if (p2?.type === 'runs') expect(p2.runs).toBe(2)

    const p3 = parseVoiceCommand('do')
    if (p3?.type === 'runs') expect(p3.runs).toBe(2)

    const p4 = parseVoiceCommand('2')
    if (p4?.type === 'runs') expect(p4.runs).toBe(2)
  })

  it('parses three runs and Hinglish teen', () => {
    const p1 = parseVoiceCommand('three')
    if (p1?.type === 'runs') expect(p1.runs).toBe(3)

    const p2 = parseVoiceCommand('teen')
    if (p2?.type === 'runs') expect(p2.runs).toBe(3)

    const p3 = parseVoiceCommand('3')
    if (p3?.type === 'runs') expect(p3.runs).toBe(3)
  })

  it('parses four runs, boundary and chauka', () => {
    const p1 = parseVoiceCommand('four')
    expect(p1?.type).toBe('runs')
    if (p1?.type === 'runs') {
      expect(p1.runs).toBe(4)
      expect(p1.isBoundary4).toBe(true)
    }

    const p2 = parseVoiceCommand('boundary')
    if (p2?.type === 'runs') {
      expect(p2.runs).toBe(4)
      expect(p2.isBoundary4).toBe(true)
    }

    const p3 = parseVoiceCommand('chauka')
    if (p3?.type === 'runs') {
      expect(p3.runs).toBe(4)
      expect(p3.isBoundary4).toBe(true)
    }
  })

  it('parses five runs and paanch', () => {
    const p1 = parseVoiceCommand('five')
    if (p1?.type === 'runs') expect(p1.runs).toBe(5)

    const p2 = parseVoiceCommand('paanch')
    if (p2?.type === 'runs') expect(p2.runs).toBe(5)
  })

  it('parses sixes, maximum and chhakka', () => {
    const p1 = parseVoiceCommand('six')
    if (p1?.type === 'runs') {
      expect(p1.runs).toBe(6)
      expect(p1.isBoundary6).toBe(true)
    }

    const p2 = parseVoiceCommand('sixer')
    if (p2?.type === 'runs') {
      expect(p2.runs).toBe(6)
      expect(p2.isBoundary6).toBe(true)
    }

    const p3 = parseVoiceCommand('maximum')
    if (p3?.type === 'runs') {
      expect(p3.runs).toBe(6)
      expect(p3.isBoundary6).toBe(true)
    }

    const p4 = parseVoiceCommand('chhakka')
    if (p4?.type === 'runs') {
      expect(p4.runs).toBe(6)
      expect(p4.isBoundary6).toBe(true)
    }
  })

  it('parses extras: wide, no ball, bye, leg bye', () => {
    expect(parseVoiceCommand('wide')).toEqual({
      type: 'extra',
      extraType: 'wide',
      runs: 1,
      originalPhrase: 'wide',
    })

    const p1 = parseVoiceCommand('wide ball')
    if (p1?.type === 'extra') expect(p1.extraType).toBe('wide')

    const p2 = parseVoiceCommand('no ball')
    if (p2?.type === 'extra') expect(p2.extraType).toBe('noball')

    const p3 = parseVoiceCommand('noball')
    if (p3?.type === 'extra') expect(p3.extraType).toBe('noball')

    const p4 = parseVoiceCommand('bye')
    if (p4?.type === 'extra') expect(p4.extraType).toBe('bye')

    const p5 = parseVoiceCommand('leg bye')
    if (p5?.type === 'extra') expect(p5.extraType).toBe('legbye')
  })

  it('parses wicket types and general out phrases', () => {
    expect(parseVoiceCommand('out')?.type).toBe('wicket')
    expect(parseVoiceCommand('wicket')?.type).toBe('wicket')

    const p1 = parseVoiceCommand('bowled')
    if (p1?.type === 'wicket') expect(p1.wicketType).toBe('bowled')

    const p2 = parseVoiceCommand('caught')
    if (p2?.type === 'wicket') expect(p2.wicketType).toBe('caught')

    const p3 = parseVoiceCommand('lbw')
    if (p3?.type === 'wicket') expect(p3.wicketType).toBe('lbw')

    const p4 = parseVoiceCommand('run out')
    if (p4?.type === 'wicket') expect(p4.wicketType).toBe('runout')

    const p5 = parseVoiceCommand('stumped')
    if (p5?.type === 'wicket') expect(p5.wicketType).toBe('stumped')
  })

  it('parses undo and cancellation phrases', () => {
    expect(parseVoiceCommand('undo')?.type).toBe('undo')
    expect(parseVoiceCommand('cancel last')?.type).toBe('undo')
    expect(parseVoiceCommand('cancel')?.type).toBe('undo')
    expect(parseVoiceCommand('wapas')?.type).toBe('undo')
  })

  it('parses conversational and noisy voice transcripts gracefully', () => {
    // 1. "uh four"
    const n1 = parseVoiceCommand('uh four')
    expect(n1?.type).toBe('runs')
    if (n1?.type === 'runs') expect(n1.runs).toBe(4)

    // 2. "that's a six"
    const n2 = parseVoiceCommand("that's a six")
    expect(n2?.type).toBe('runs')
    if (n2?.type === 'runs') expect(n2.runs).toBe(6)

    // 3. "wide ball"
    const n3 = parseVoiceCommand('wide ball')
    expect(n3?.type).toBe('extra')
    if (n3?.type === 'extra') expect(n3.extraType).toBe('wide')

    // 4. "took a single"
    const n4 = parseVoiceCommand('took a single')
    expect(n4?.type).toBe('runs')
    if (n4?.type === 'runs') expect(n4.runs).toBe(1)

    // 5. "just two runs"
    const n5 = parseVoiceCommand('just two runs')
    expect(n5?.type).toBe('runs')
    if (n5?.type === 'runs') expect(n5.runs).toBe(2)

    // 6. "oh clean bowled!"
    const n6 = parseVoiceCommand('oh clean bowled!')
    expect(n6?.type).toBe('wicket')
    if (n6?.type === 'wicket') expect(n6.wicketType).toBe('bowled')

    // 7. "great catch!"
    const n7 = parseVoiceCommand('great catch!')
    expect(n7?.type).toBe('wicket')
    if (n7?.type === 'wicket') expect(n7.wicketType).toBe('caught')

    // 8. "please undo last"
    const n8 = parseVoiceCommand('please undo last')
    expect(n8?.type).toBe('undo')
  })

  it('returns null on unrecognized or gibberish input', () => {
    expect(parseVoiceCommand('')).toBeNull()
    expect(parseVoiceCommand('hello world what is the weather')).toBeNull()
  })
})
