import { CalendarIcon, PencilIcon, Trash2Icon, TriangleAlertIcon, UserIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Task } from "@/lib/api/tasks"
import { formatDate } from "@/lib/dates"

type TaskCardProps = {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  /** Prazo vencido e não concluída: cartão destacado como "Atrasada". */
  overdue?: boolean
  /** Controles extras no rodapé do cartão (ex.: seletor de status do quadro). */
  footer?: React.ReactNode
}

// Cartão de tarefa: título, responsável e prazo.
export function TaskCard({ task, onEdit, onDelete, overdue = false, footer }: TaskCardProps) {
  return (
    <Card
      size="sm"
      aria-label={task.title}
      role="article"
      data-overdue={overdue}
      className="data-[overdue=true]:ring-destructive/60"
    >
      <CardHeader className="grid-cols-[1fr_auto]">
        <CardTitle className="break-words">{task.title}</CardTitle>
        <div className="col-start-2 row-span-2 row-start-1 -mt-1 -mr-1 flex">
          <Button variant="ghost" size="icon-sm" aria-label={`Editar tarefa ${task.title}`} onClick={() => onEdit(task)}>
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Excluir tarefa ${task.title}`}
            onClick={() => onDelete(task)}
          >
            <Trash2Icon />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {task.description && <p className="line-clamp-3 whitespace-pre-line text-muted-foreground">{task.description}</p>}
        <dl className="flex flex-col gap-1 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <dt>
              <UserIcon className="size-3.5" aria-label="Responsável" />
            </dt>
            <dd className={task.assignee ? "text-foreground" : undefined}>{task.assignee?.name ?? "Sem responsável"}</dd>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <dt>
              <CalendarIcon className="size-3.5" aria-label="Prazo" />
            </dt>
            <dd className={overdue ? "font-medium text-destructive" : undefined}>{formatDate(task.dueDate)}</dd>
            {overdue && (
              <dd>
                <Badge variant="destructive">
                  <TriangleAlertIcon data-icon="inline-start" />
                  Atrasada
                </Badge>
              </dd>
            )}
          </div>
        </dl>
        {footer}
      </CardContent>
    </Card>
  )
}
