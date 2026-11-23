import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import { type Task, type TaskStatus, type TaskSummary, taskKeys, tasksApi } from "@/lib/api/tasks"
import { isOverdue, STATUSES } from "../board"
import { StatusSelect } from "./status-select"
import { TaskCard } from "./task-card"

type TasksData = { tasks: Task[]; summary: TaskSummary }

type TaskBoardProps = {
  groupId: number
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

// Quadro com três colunas fixas (RF08). No celular as colunas ficam empilhadas.
export function TaskBoard({ groupId, tasks, onEdit, onDelete }: TaskBoardProps) {
  const queryClient = useQueryClient()
  const key = taskKeys.list(groupId)

  // Muda o cartão de coluna na hora; se o backend recusar, volta para a coluna anterior.
  const changeStatus = useMutation({
    mutationFn: ({ task, status }: { task: Task; status: TaskStatus }) =>
      tasksApi.updateStatus(groupId, task.id, status),
    onMutate: async ({ task, status }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TasksData>(key)
      queryClient.setQueryData<TasksData>(key, (old) =>
        old ? { ...old, tasks: old.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)) } : old,
      )
      return { previous }
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      const reason = error instanceof ApiError && error.code !== "INTERNAL_ERROR" ? ` ${error.message}.` : ""
      toast.error(`Não foi possível mudar o status.${reason} A tarefa voltou para a coluna anterior.`)
    },
    // Confere com o que está salvo (inclusive mudanças de outros integrantes).
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {STATUSES.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.value)
        return (
          <section
            key={column.value}
            aria-labelledby={`column-${column.value}`}
            className="flex min-w-0 flex-col gap-3 rounded-xl bg-muted/50 p-3"
          >
            <h3 id={`column-${column.value}`} className="flex items-center justify-between text-sm font-medium">
              {column.label}
              <span className="rounded-full bg-background px-2 text-xs text-muted-foreground">
                {columnTasks.length}
              </span>
            </h3>
            {columnTasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma tarefa</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {columnTasks.map((task) => (
                  <li key={task.id}>
                    <TaskCard
                      task={task}
                      overdue={isOverdue(task)}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      footer={<StatusSelect task={task} onChange={(status) => changeStatus.mutate({ task, status })} />}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
