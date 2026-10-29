import { env } from "@/config/env"
import { loadSession } from "@/lib/auth/session"

export type FieldErrors = Record<string, string>

// Espelha o formato de erro do backend: { error: { code, message, fields? } }.
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: FieldErrors

  constructor(status: number, code: string, message: string, fields: FieldErrors = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.fields = fields
  }
}

// Registrado pelo AuthProvider: chamado quando uma rota protegida responde 401 UNAUTHENTICATED.
let onUnauthenticated: (() => void) | null = null

export function setUnauthenticatedHandler(handler: () => void) {
  onUnauthenticated = handler
}

type RequestOptions = {
  method?: "GET" | "POST"
  body?: unknown
  /** Envia o Bearer token da sessão. */
  auth?: boolean
}

export async function request<T>(path: string, { method = "GET", body, auth = false }: RequestOptions = {}) {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  const token = auth ? loadSession()?.token : null
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Não foi possível conectar ao servidor. Tente novamente.")
  }

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = data?.error
    const apiError = new ApiError(
      response.status,
      error?.code ?? "INTERNAL_ERROR",
      error?.message ?? "Algo deu errado. Tente novamente.",
      error?.fields ?? {},
    )
    if (auth && apiError.code === "UNAUTHENTICATED") onUnauthenticated?.()
    throw apiError
  }
  return data as T
}
