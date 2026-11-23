import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ApiError } from "@/lib/api/client"
import { type Task, taskKeys, tasksApi } from "@/lib/api/tasks"

type DeleteTaskDialogProps = {
  groupId: number
  task: Task | null
  onOpenChange: (open: boolean) => void
}

// Exclusão sempre pede confirmação (RF07).
export function DeleteTaskDialog({ groupId, task, onOpenChange }: DeleteTaskDialogProps) {
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: (t: Task) => tasksApi.remove(groupId, t.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.list(groupId) })
      toast.success("Tarefa excluída")
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível excluir a tarefa.")
      // Ex.: outro integrante já excluiu: recarrega para a tela refletir o que está salvo.
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(groupId) })
      onOpenChange(false)
    },
  })

  return (
    <AlertDialog open={task !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
          <AlertDialogDescription>
            “{task?.title}” será excluída para todos os integrantes. Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={remove.isPending}
            onClick={(e) => {
              e.preventDefault()
              if (task) remove.mutate(task)
            }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
