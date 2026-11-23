import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import type { Task, TaskStatus } from "@/lib/api/tasks"
import { STATUSES } from "../board"

// Seletor de status no próprio cartão (RF08): um toque para mudar de coluna.
export function StatusSelect({ task, onChange }: { task: Task; onChange: (status: TaskStatus) => void }) {
  return (
    <NativeSelect
      size="sm"
      className="w-full"
      aria-label={`Status de ${task.title}`}
      value={task.status}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
    >
      {STATUSES.map((s) => (
        <NativeSelectOption key={s.value} value={s.value}>
          {s.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  )
}
