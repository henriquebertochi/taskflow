import { useQueryClient } from "@tanstack/react-query"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { authApi, type Session, type User } from "@/lib/api/auth"
import { setUnauthenticatedHandler } from "@/lib/api/client"
import { clearSession, loadSession, saveSession } from "./session"

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(loadSession)

  const endSession = useCallback(() => {
    clearSession()
    setSession(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setUnauthenticatedHandler(endSession)
  }, [endSession])

  const login = useCallback(async (email: string, password: string) => {
    const next = await authApi.login({ email, password })
    saveSession(next)
    setSession(next)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Sessão local é encerrada mesmo se a chamada falhar (ex.: rede ou token já expirado).
    } finally {
      endSession()
    }
  }, [endSession])

  const value = useMemo(
    () => ({ user: session?.user ?? null, isAuthenticated: session !== null, login, logout }),
    [session, login, logout],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>")
  return ctx
}
