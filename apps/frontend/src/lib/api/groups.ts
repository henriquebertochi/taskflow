import { request } from "./client"

export type GroupRole = "creator" | "member"

export type GroupSummary = {
  id: number
  name: string
  description: string | null
  role: GroupRole
  memberCount: number
  createdAt: string
}

export type Group = {
  id: number
  name: string
  description: string | null
  inviteCode: string
  role: GroupRole
  createdAt: string
}

export const groupsApi = {
  list: () => request<{ groups: GroupSummary[] }>("/groups", { auth: true }),

  get: (id: number | string) => request<{ group: Group }>(`/groups/${id}`, { auth: true }),

  create: (input: { name: string; description?: string }) =>
    request<{ group: Group }>("/groups", { method: "POST", body: input, auth: true }),
}

export const groupKeys = {
  all: ["groups"] as const,
  detail: (id: number | string) => ["groups", String(id)] as const,
}
