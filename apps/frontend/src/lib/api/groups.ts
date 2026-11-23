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

export type Member = { id: number; name: string; role: GroupRole; joinedAt: string }

export type Invite = { group: { id: number; name: string; memberCount: number } }

export const groupsApi = {
  list: () => request<{ groups: GroupSummary[] }>("/groups", { auth: true }),

  get: (id: number | string) => request<{ group: Group }>(`/groups/${id}`, { auth: true }),

  create: (input: { name: string; description?: string }) =>
    request<{ group: Group }>("/groups", { method: "POST", body: input, auth: true }),

  members: (id: number | string) => request<{ members: Member[] }>(`/groups/${id}/members`, { auth: true }),

  regenerateInvite: (id: number | string) =>
    request<{ inviteCode: string }>(`/groups/${id}/invite`, { method: "POST", auth: true }),
}

export const invitesApi = {
  get: (code: string) => request<Invite>(`/invites/${encodeURIComponent(code)}`),

  join: (code: string) =>
    request<{ group: { id: number; name: string }; joined: boolean }>(`/invites/${encodeURIComponent(code)}/join`, {
      method: "POST",
      auth: true,
    }),
}

export function inviteUrl(code: string) {
  return `${window.location.origin}/convite/${code}`
}

export const groupKeys = {
  all: ["groups"] as const,
  detail: (id: number | string) => ["groups", String(id)] as const,
  members: (id: number | string) => ["groups", String(id), "members"] as const,
}
