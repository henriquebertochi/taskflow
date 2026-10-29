import { z } from "zod"

// Espelham as regras de apps/backend/src/modules/auth/auth.schemas.ts (o backend continua sendo a autoridade).
const email = z.string().trim().min(1, "Informe o e-mail").pipe(z.email("E-mail inválido"))

const password = z
  .string()
  .min(8, "A senha deve ter no mínimo 8 caracteres")
  .max(72, "A senha deve ter no máximo 72 caracteres")

const passwordConfirmation = z.string().min(1, "Confirme a senha")

const mismatch = { message: "As senhas não coincidem", path: ["passwordConfirmation"] }

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome completo").max(120, "O nome deve ter no máximo 120 caracteres"),
    email,
    password,
    passwordConfirmation,
  })
  .refine((d) => d.password === d.passwordConfirmation, mismatch)

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail"),
  password: z.string().min(1, "Informe a senha"),
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({ password, passwordConfirmation })
  .refine((d) => d.password === d.passwordConfirmation, mismatch)

export type RegisterValues = z.infer<typeof registerSchema>
export type LoginValues = z.infer<typeof loginSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
