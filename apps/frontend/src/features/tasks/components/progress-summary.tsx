import { TriangleAlertIcon } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { TaskSummary } from "@/lib/api/tasks"

// Topo do quadro (RF08): % de tarefas concluídas e quantas estão atrasadas.
export function ProgressSummary({ summary }: { summary: TaskSummary }) {
  const { total, done, overdue, percentDone } = summary
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p>
          <span className="text-3xl font-medium tabular-nums">{percentDone}%</span>{" "}
          <span className="text-muted-foreground">concluído</span>
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {done} de {total} {total === 1 ? "tarefa concluída" : "tarefas concluídas"}
        </p>
      </div>
      <Progress value={percentDone} aria-label="Progresso do grupo" className="h-1.5" />
      <p
        data-overdue={overdue > 0}
        className="flex items-center gap-1.5 text-sm text-muted-foreground data-[overdue=true]:font-medium data-[overdue=true]:text-destructive"
      >
        {overdue > 0 && <TriangleAlertIcon className="size-4" />}
        {overdue === 0 ? "Nenhuma tarefa atrasada" : overdue === 1 ? "1 tarefa atrasada" : `${overdue} tarefas atrasadas`}
      </p>
    </div>
  )
}
