import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api/client"
import { type Task, type TaskStatus, type TaskSummary, taskKeys, tasksApi } from "@/lib/api/tasks"
import { isOverdue, STATUSES } from "../board"
import { CardMouseSensor, CardTouchSensor, droppedStatus } from "../dnd"
import { StatusSelect } from "./status-select"
import { TaskCard } from "./task-card"

type TasksData = { tasks: Task[]; summary: TaskSummary }

type TaskBoardProps = {
  groupId: number
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

// Quadro com três colunas fixas (RF08). O status muda pelo seletor do cartão ou arrastando o
// cartão para outra coluna. No celular as colunas ficam empilhadas (segurar o cartão para arrastar).
export function TaskBoard({ groupId, tasks, onEdit, onDelete }: TaskBoardProps) {
  const queryClient = useQueryClient()
  const key = taskKeys.list(groupId)
  const [dragging, setDragging] = useState<Task | null>(null)

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

  const sensors = useSensors(
    useSensor(CardMouseSensor, { activationConstraint: { distance: 6 } }),
    // Segurar antes de arrastar, para não atrapalhar a rolagem da página no celular.
    useSensor(CardTouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    setDragging((event.active.data.current?.task as Task | undefined) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragging(null)
    const status = droppedStatus(event)
    const task = event.active.data.current?.task as Task | undefined
    if (task && status) changeStatus.mutate({ task, status })
  }

  const renderCard = (task: Task) => (
    <TaskCard
      task={task}
      overdue={isOverdue(task)}
      onEdit={onEdit}
      onDelete={onDelete}
      footer={<StatusSelect task={task} onChange={(status) => changeStatus.mutate({ task, status })} />}
    />
  )

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="grid gap-6 md:grid-cols-3 md:gap-4">
        {STATUSES.map((column) => (
          <BoardColumn
            key={column.value}
            status={column.value}
            label={column.label}
            tasks={tasks.filter((t) => t.status === column.value)}
            renderCard={renderCard}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging && <div data-drag-overlay className="rotate-1 cursor-grabbing rounded-xl shadow-[0_8px_24px_rgb(0_0_0/0.12)]">{renderCard(dragging)}</div>}
      </DragOverlay>
    </DndContext>
  )
}

type BoardColumnProps = {
  status: TaskStatus
  label: string
  tasks: Task[]
  renderCard: (task: Task) => React.ReactNode
}

function BoardColumn({ status, label, tasks, renderCard }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`column-${status}`}
      data-status={status}
      data-over={isOver}
      className="-m-2 flex min-w-0 flex-col gap-3 rounded-2xl p-2 transition-colors duration-150 data-[over=true]:bg-primary/8 data-[over=true]:ring-1 data-[over=true]:ring-primary/30"
    >
      <h3 id={`column-${status}`} className="flex items-center gap-2 border-b pb-2 text-sm font-medium">
        {label}
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{tasks.length}</span>
      </h3>
      {tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
          {isOver ? "Solte aqui" : "Nenhuma tarefa"}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <DraggableCard task={task}>{renderCard(task)}</DraggableCard>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DraggableCard({ task, children }: { task: Task; children: React.ReactNode }) {
  // Sem os `attributes` do dnd-kit: pelo teclado e leitor de tela o status muda pelo seletor.
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: task.id, data: { task } })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      data-task-id={task.id}
      className="cursor-grab touch-manipulation select-none data-[dragging=true]:opacity-40"
      data-dragging={isDragging}
    >
      {children}
    </div>
  )
}
