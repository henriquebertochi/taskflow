import { CalendarIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { Avatar } from "@/components/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Task } from "@/lib/api/tasks"
import { useAuth } from "@/lib/auth/auth-context"
import { formatDate, relativeDue } from "@/lib/dates"

type TaskCardProps = {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  /** Prazo vencido e não concluída: data destacada como "Atrasada". */
  overdue?: boolean
  /** Controles extras no rodapé do cartão (ex.: seletor de status do quadro). */
  footer?: React.ReactNode
}

// Cartão de tarefa: título, responsável e prazo.
export function TaskCard({ task, onEdit, onDelete, overdue = false, footer }: TaskCardProps) {
  const { user } = useAuth()
  const isMine = task.assignee != null && user != null && String(task.assignee.id) === String(user.id)
  const done = task.status === "done"

  return (
    <Card size="sm" aria-label={task.title} role="article" data-overdue={overdue} className="group/task">
      <CardHeader className="grid-cols-[1fr_auto]">
        <CardTitle className="text-[0.9375rem] leading-snug font-medium break-words data-[done=true]:text-muted-foreground" data-done={done}>
          {task.title}
        </CardTitle>
        {/* Em telas com mouse as ações aparecem no hover/foco; no toque ficam sempre visíveis. */}
        <div className="col-start-2 row-span-2 row-start-1 -mt-1 -mr-1 flex transition-opacity duration-150 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within/task:opacity-100 [@media(hover:hover)]:group-hover/task:opacity-100">
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
        <dl className="flex flex-col gap-2 text-muted-foreground">
          <div className="flex items-center gap-2">
            <dt className="sr-only">Responsável</dt>
            <dd className="flex min-w-0 items-center gap-2">
              {task.assignee ? (
                <>
                  <Avatar name={task.assignee.name} className="size-5 text-[0.625rem]" />
                  <span className="truncate text-foreground">{task.assignee.name}</span>
                  {isMine && <span className="shrink-0 text-xs font-medium text-primary">você</span>}
                </>
              ) : (
                <span>Sem responsável</span>
              )}
            </dd>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <dt>
              <CalendarIcon className="size-4" aria-label="Prazo" />
            </dt>
            <dd className={overdue ? "font-medium text-destructive tabular-nums" : "tabular-nums"}>{formatDate(task.dueDate)}</dd>
            {overdue ? (
              <dd className="text-xs font-medium text-destructive">Atrasada</dd>
            ) : (
              !done && <dd className="text-xs">{relativeDue(task.dueDate)}</dd>
            )}
          </div>
        </dl>
        {footer}
      </CardContent>
    </Card>
  )
}
