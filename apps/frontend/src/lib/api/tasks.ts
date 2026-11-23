import { request } from "./client"

export type TaskStatus = "todo" | "in_progress" | "done"

export type Task = {
  id: number
  groupId: number
  title: string
  description: string | null
  status: TaskStatus
  dueDate: string
  assignee: { id: number; name: string } | null
  overdue: boolean
  createdAt: string
  updatedAt: string
}

export type TaskInput = {
  title: string
  description: string
  assigneeId: number | null
  dueDate: string
}

const base = (groupId: number | string) => `/groups/${groupId}/tasks`

export const tasksApi = {
  list: (groupId: number | string) => request<{ tasks: Task[] }>(base(groupId), { auth: true }),

  create: (groupId: number | string, input: TaskInput) =>
    request<{ task: Task }>(base(groupId), { method: "POST", body: input, auth: true }),

  update: (groupId: number | string, taskId: number, input: TaskInput) =>
    request<{ task: Task }>(`${base(groupId)}/${taskId}`, { method: "PUT", body: input, auth: true }),

  remove: (groupId: number | string, taskId: number) =>
    request<void>(`${base(groupId)}/${taskId}`, { method: "DELETE", auth: true }),
}

export const taskKeys = {
  list: (groupId: number | string) => ["groups", String(groupId), "tasks"] as const,
}
