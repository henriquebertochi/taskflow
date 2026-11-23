import { z } from "zod"

// Espelha apps/backend/src/modules/groups/groups.schemas.ts (o backend continua sendo a autoridade).
export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do grupo").max(60, "O nome deve ter no máximo 60 caracteres"),
  description: z.string().trim().max(500, "A descrição deve ter no máximo 500 caracteres"),
})

export type CreateGroupValues = z.infer<typeof createGroupSchema>
