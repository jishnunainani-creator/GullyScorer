import { useState, useEffect, useRef, useCallback } from 'react'
import { parseVoiceCommand } from './parser'
import type { VoiceCommand } from './types'

// Declarations for browser SpeechRecognition API
interface SpeechRecognitionResultItem {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  readonly length: number
  item(index: number): SpeechRecognitionResultItem
  [index: number]: SpeechRecognitionResultItem
  isFinal: boolean
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface ISpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionConstructor {
  new (): ISpeechRecognition
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export interface UseVoiceScoringOptions {
  onCommand: (command: VoiceCommand) => void
  onPendingConfirmation?: (command: VoiceCommand, cancel: () => void) => void
}

export function useVoiceScoring(options: UseVoiceScoringOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [lastTranscript, setLastTranscript] = useState<string>('')
  const [pendingCommand, setPendingCommand] = useState<VoiceCommand | null>(null)
  const [countdown, setCountdown] = useState<number>(3)

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    const SpeechClass =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined

    if (!SpeechClass) {
      setIsSupported(false)
      return
    }

    try {
      const recognition = new SpeechClass()
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-IN' // Supports English with Indian accent / Hinglish phrases

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const lastResult = event.results[event.results.length - 1]
        const text = lastResult?.[0]?.transcript?.trim()
        if (text) {
          setLastTranscript(text)
          const cmd = parseVoiceCommand(text)
          if (cmd) {
            handleParsedCommand(cmd)
          }
        }
      }

      recognition.onerror = () => {
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    } catch {
      setIsSupported(false)
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (timerRef.current) clearTimeout(timerRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [])

  const cancelPending = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    setPendingCommand(null)
    setCountdown(3)
  }, [])

  const handleParsedCommand = useCallback(
    (cmd: VoiceCommand) => {
      // Wicket and Undo require confirmation (3s countdown)
      if (cmd.type === 'wicket' || cmd.type === 'undo') {
        cancelPending()
        setPendingCommand(cmd)
        setCountdown(3)

        countdownIntervalRef.current = setInterval(() => {
          setCountdown((prev) => (prev > 1 ? prev - 1 : 1))
        }, 1000)

        timerRef.current = setTimeout(() => {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
          optionsRef.current.onCommand(cmd)
          setPendingCommand(null)
          setCountdown(3)
        }, 3000)
      } else {
        // Runs and Extras commit immediately
        optionsRef.current.onCommand(cmd)
      }
    },
    [cancelPending],
  )

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch {
        setIsListening(false)
      }
    }
  }, [isListening])

  return {
    isListening,
    isSupported,
    lastTranscript,
    pendingCommand,
    countdown,
    cancelPending,
    toggleListening,
  }
}
