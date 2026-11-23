import { useQuery } from "@tanstack/react-query"
import { ClipboardListIcon, PlusIcon } from "lucide-react"
import { useState } from "react"
import { EmptyState } from "@/components/empty-state"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { groupKeys, groupsApi } from "@/lib/api/groups"
import { type Task, taskKeys, tasksApi } from "@/lib/api/tasks"
import { summarize } from "../board"
import { DeleteTaskDialog } from "./delete-task-dialog"
import { ProgressSummary } from "./progress-summary"
import { TaskBoard } from "./task-board"
import { TaskFormDialog } from "./task-form-dialog"

// Quadro de tarefas do grupo: criar, editar e excluir (RF07), status e progresso (RF08).
export function TasksSection({ groupId }: { groupId: number }) {
  const tasksQuery = useQuery({ queryKey: taskKeys.list(groupId), queryFn: () => tasksApi.list(groupId) })
  const membersQuery = useQuery({ queryKey: groupKeys.members(groupId), queryFn: () => groupsApi.members(groupId) })
  const [form, setForm] = useState<{ open: boolean; task?: Task }>({ open: false })
  const [deleting, setDeleting] = useState<Task | null>(null)

  const openCreate = () => setForm({ open: true })
  const openEdit = (task: Task) => setForm({ open: true, task })
  const newTaskButton = (
    <Button onClick={openCreate}>
      <PlusIcon data-icon="inline-start" />
      Nova tarefa
    </Button>
  )

  const tasks = tasksQuery.data?.tasks
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Quadro de tarefas</h2>
        {tasks && tasks.length > 0 && newTaskButton}
      </div>

      {tasksQuery.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : tasksQuery.isError ? (
        <QueryError error={tasksQuery.error} onRetry={() => void tasksQuery.refetch()} />
      ) : tasks!.length === 0 ? (
        <EmptyState
          icon={<ClipboardListIcon />}
          title="Nenhuma tarefa ainda"
          description="Crie tarefas e defina o responsável e o prazo de cada uma."
          action={newTaskButton}
        />
      ) : (
        <>
          <ProgressSummary summary={summarize(tasks!)} />
          <TaskBoard groupId={groupId} tasks={tasks!} onEdit={openEdit} onDelete={setDeleting} />
        </>
      )}

      <TaskFormDialog
        groupId={groupId}
        members={membersQuery.data?.members ?? []}
        task={form.task}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
      />
      <DeleteTaskDialog groupId={groupId} task={deleting} onOpenChange={(open) => !open && setDeleting(null)} />
    </div>
  )
}
