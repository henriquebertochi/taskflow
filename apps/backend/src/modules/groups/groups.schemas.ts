import { z } from "zod";

export const createGroupSchema = z.object({
  name: z
    .string({ error: "Informe o nome do grupo" })
    .trim()
    .min(1, "Informe o nome do grupo")
    .max(60, "O nome deve ter no máximo 60 caracteres"),
  description: z
    .string()
    .trim()
    .max(500, "A descrição deve ter no máximo 500 caracteres")
    .nullish()
    .transform((v) => v || null),
});
