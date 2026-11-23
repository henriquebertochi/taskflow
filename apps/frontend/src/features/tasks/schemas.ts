import { z } from "zod"
import { todayISO } from "@/lib/dates"

// Espelha apps/backend/src/modules/tasks/tasks.schemas.ts (o backend continua sendo a autoridade).
// `keepDueDate`: na edição, o prazo atual pode ser mantido mesmo se já venceu.
export function taskFormSchema({ keepDueDate }: { keepDueDate?: string } = {}) {
  return z.object({
    title: z.string().trim().min(1, "Informe o título").max(120, "O título deve ter no máximo 120 caracteres"),
    description: z.string().trim().max(2000, "A descrição deve ter no máximo 2000 caracteres"),
    // "" = Sem responsável
    assigneeId: z.string(),
    dueDate: z
      .string()
      .min(1, "Informe o prazo")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Prazo inválido")
      .refine((v) => v === keepDueDate || v >= todayISO(), "O prazo não pode ser uma data passada"),
  })
}

export type TaskFormValues = z.infer<ReturnType<typeof taskFormSchema>>
