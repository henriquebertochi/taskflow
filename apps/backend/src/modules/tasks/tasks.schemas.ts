import { z } from "zod";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const isRealDate = (value: string) => {
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

export const taskInputSchema = z.object({
  title: z
    .string({ error: "Informe o título" })
    .trim()
    .min(1, "Informe o título")
    .max(120, "O título deve ter no máximo 120 caracteres"),
  description: z
    .string()
    .trim()
    .max(2000, "A descrição deve ter no máximo 2000 caracteres")
    .nullish()
    .transform((v) => v || null),
  // null (ou ausente) = "Sem responsável".
  assigneeId: z
    .number({ error: "Responsável inválido" })
    .int("Responsável inválido")
    .positive("Responsável inválido")
    .nullish()
    .transform((v) => v ?? null),
  dueDate: z
    .string({ error: "Informe o prazo" })
    .min(1, "Informe o prazo")
    .regex(isoDate, "Prazo inválido")
    .refine(isRealDate, "Prazo inválido"),
});

export type TaskInput = z.infer<typeof taskInputSchema>;
