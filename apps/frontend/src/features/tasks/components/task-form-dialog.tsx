import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { FormAlert } from "@/components/form-alert"
import { SelectField } from "@/components/select-field"
import { SubmitButton } from "@/components/submit-button"
import { TextareaField } from "@/components/textarea-field"
import { TextField } from "@/components/text-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FieldGroup } from "@/components/ui/field"
import { NativeSelectOption } from "@/components/ui/native-select"
import type { Member } from "@/lib/api/groups"
import { type Task, taskKeys, tasksApi } from "@/lib/api/tasks"
import { todayISO } from "@/lib/dates"
import { applyApiError } from "@/lib/forms"
import { taskFormSchema, type TaskFormValues } from "../schemas"

type TaskFormDialogProps = {
  groupId: number
  members: Member[]
  /** Tarefa a editar; sem ela, o formulário cria uma nova. */
  task?: Task
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskFormDialog(props: TaskFormDialogProps) {
  const { task, open, onOpenChange } = props
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>Defina o que precisa ser feito, quem faz e até quando.</DialogDescription>
        </DialogHeader>
        {/* Remonta a cada abertura para começar com os valores atuais da tarefa. */}
        {open && <TaskForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function TaskForm({ groupId, members, task, onOpenChange }: TaskFormDialogProps) {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema({ keepDueDate: task?.dueDate })),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      assigneeId: task?.assignee ? String(task.assignee.id) : "",
      dueDate: task?.dueDate ?? "",
    },
    mode: "onTouched",
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const input = { ...values, assigneeId: values.assigneeId ? Number(values.assigneeId) : null }
    try {
      if (task) await tasksApi.update(groupId, task.id, input)
      else await tasksApi.create(groupId, input)
      await queryClient.invalidateQueries({ queryKey: taskKeys.list(groupId) })
      toast.success(task ? "Tarefa atualizada" : "Tarefa criada")
      onOpenChange(false)
    } catch (error) {
      setFormError(applyApiError(form, error))
    }
  })

  const today = todayISO()
  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={formError} />
        <TextField label="Título" autoComplete="off" error={errors.title} {...form.register("title")} />
        <TextareaField label="Descrição (opcional)" rows={3} error={errors.description} {...form.register("description")} />
        <SelectField label="Responsável" error={errors.assigneeId} {...form.register("assigneeId")}>
          <NativeSelectOption value="">Sem responsável</NativeSelectOption>
          {members.map((m) => (
            <NativeSelectOption key={m.id} value={String(m.id)}>
              {m.name}
            </NativeSelectOption>
          ))}
        </SelectField>
        <TextField
          label="Prazo"
          type="date"
          min={task && task.dueDate < today ? task.dueDate : today}
          error={errors.dueDate}
          {...form.register("dueDate")}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="sm:flex-1">
              Cancelar
            </Button>
          </DialogClose>
          <div className="sm:flex-1">
            <SubmitButton pending={isSubmitting}>{task ? "Salvar" : "Criar tarefa"}</SubmitButton>
          </div>
        </div>
      </FieldGroup>
    </form>
  )
}
