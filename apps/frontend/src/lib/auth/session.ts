import type { Session } from "@/lib/api/auth"

// O backend usa Bearer token (não cookie), então a sessão fica em localStorage.
// Trade-off conhecido: legível por qualquer script da página (XSS). Mantemos a CSP/dependências enxutas.
const STORAGE_KEY = "taskflow:session"

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    if (!session.token || new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}
