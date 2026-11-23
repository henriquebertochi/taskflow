import type { Task, TaskStatus, TaskSummary } from "@/lib/api/tasks"
import { todayISO } from "@/lib/dates"

// Três colunas fixas do quadro (RF08), nesta ordem.
export const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "A fazer" },
  { value: "in_progress", label: "Em andamento" },
  { value: "done", label: "Concluído" },
]

// Atrasada = prazo vencido e não concluída. Calculado aqui (mesma regra do backend) para
// o destaque e o resumo mudarem na hora em que o status muda.
export function isOverdue(task: Pick<Task, "status" | "dueDate">, today = todayISO()) {
  return task.status !== "done" && task.dueDate < today
}

export function summarize(tasks: Task[], today = todayISO()): TaskSummary {
  const total = tasks.length
  const done = tasks.filter((t) => t.status === "done").length
  const overdue = tasks.filter((t) => isOverdue(t, today)).length
  return { total, done, overdue, percentDone: total === 0 ? 0 : Math.round((done * 100) / total) }
}
