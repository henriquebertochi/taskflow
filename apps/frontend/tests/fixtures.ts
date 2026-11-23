import { HttpResponse } from "msw"

export const API = "http://localhost/api"

export const user = { id: "1", name: "Ana Souza", email: "ana@example.com", createdAt: "2026-10-29T00:00:00Z" }

export const apiError = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  HttpResponse.json({ error: { code, message, fields } }, { status })

export function storeSession() {
  localStorage.setItem(
    "taskflow:session",
    JSON.stringify({ token: "tok", expiresAt: new Date(Date.now() + 3600_000).toISOString(), user }),
  )
}
