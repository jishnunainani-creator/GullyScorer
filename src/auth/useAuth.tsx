import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type SyncState = 'local_only' | 'syncing' | 'synced' | 'offline' | 'error'

export interface AuthContextType {
  user: User | null
  session: Session | null
  isAnonymous: boolean
  isOnline: boolean
  syncState: SyncState
  setSyncState: (state: SyncState) => void
  signInAnonymously: () => Promise<void>
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>
  upgradeAccount: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [syncState, setSyncState] = useState<SyncState>('local_only')

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (syncState === 'offline') {
        setSyncState('synced')
      }
    }
    const handleOffline = () => {
      setIsOnline(false)
      setSyncState('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncState])

  const ensureAnonymousSession = useCallback(async () => {
    if (!isSupabaseConfigured() || !navigator.onLine) {
      setSyncState('local_only')
      return
    }

    try {
      const { data: { session: existingSession } } = await supabase.auth.getSession()
      if (existingSession) {
        setSession(existingSession)
        setUser(existingSession.user)
        setSyncState('synced')
        return
      }

      // Anonymous sign-in on first launch
      const { data, error } = await supabase.auth.signInAnonymously()
      if (!error && data.session) {
        setSession(data.session)
        setUser(data.user)
        setSyncState('synced')
      }
    } catch {
      setSyncState('local_only')
    }
  }, [])

  useEffect(() => {
    void ensureAnonymousSession()

    if (!isSupabaseConfigured()) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        if (currentSession) {
          setSyncState(navigator.onLine ? 'synced' : 'offline')
        } else {
          setSyncState('local_only')
        }
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [ensureAnonymousSession])

  const signInAnonymously = async () => {
    if (!isSupabaseConfigured() || !isOnline) return
    const { data, error } = await supabase.auth.signInAnonymously()
    if (!error && data.session) {
      setSession(data.session)
      setUser(data.user)
      setSyncState('synced')
    }
  }

  const signInWithOtp = async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase is not configured') }
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return { error }
  }

  const upgradeAccount = async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase is not configured') }
    }
    // Upgrades anonymous user to permanent account without losing user ID and data
    const { error } = await supabase.auth.updateUser({ email })
    return { error }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured()) return
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setSyncState('local_only')
  }

  const isAnonymous = Boolean(user?.is_anonymous)

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAnonymous,
        isOnline,
        syncState,
        setSyncState,
        signInAnonymously,
        signInWithOtp,
        upgradeAccount,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
