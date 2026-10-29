import { request } from "./client"

export type User = { id: string; name: string; email: string; createdAt: string }
export type Session = { token: string; expiresAt: string; user: User }

export const authApi = {
  register: (input: { name: string; email: string; password: string; passwordConfirmation: string }) =>
    request<{ message: string; user: User }>("/auth/register", { method: "POST", body: input }),

  login: (input: { email: string; password: string }) =>
    request<Session>("/auth/login", { method: "POST", body: input }),

  logout: () => request<void>("/auth/logout", { method: "POST", auth: true }),

  me: () => request<{ user: User }>("/auth/me", { auth: true }),

  forgotPassword: (input: { email: string }) =>
    request<{ message: string }>("/auth/forgot-password", { method: "POST", body: input }),

  validateResetToken: (token: string) =>
    request<{ valid: true }>(`/auth/reset-password/${encodeURIComponent(token)}`),

  resetPassword: (input: { token: string; password: string; passwordConfirmation: string }) =>
    request<{ message: string }>("/auth/reset-password", { method: "POST", body: input }),
}
