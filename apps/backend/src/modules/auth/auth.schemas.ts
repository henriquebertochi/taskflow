import { z } from "zod";

const email = z
  .string({ error: "Informe o e-mail" })
  .trim()
  .toLowerCase()
  .min(1, "Informe o e-mail")
  .pipe(z.email("E-mail inválido"));

const password = z
  .string({ error: "Informe a senha" })
  .min(8, "A senha deve ter no mínimo 8 caracteres")
  .max(72, "A senha deve ter no máximo 72 caracteres");

const passwordConfirmation = z.string({ error: "Confirme a senha" }).min(1, "Confirme a senha");

const passwordsMatch = (data: { password: string; passwordConfirmation: string }) =>
  data.password === data.passwordConfirmation;
const mismatch = { message: "As senhas não coincidem", path: ["passwordConfirmation"] };

export const registerSchema = z
  .object({
    name: z.string({ error: "Informe o nome completo" }).trim().min(1, "Informe o nome completo").max(120),
    email,
    password,
    passwordConfirmation,
  })
  .refine(passwordsMatch, mismatch);

export const loginSchema = z.object({
  email: z.string({ error: "Informe o e-mail" }).trim().toLowerCase().min(1, "Informe o e-mail"),
  password: z.string({ error: "Informe a senha" }).min(1, "Informe a senha"),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string({ error: "Token ausente" }).min(1, "Token ausente"),
    password,
    passwordConfirmation,
  })
  .refine(passwordsMatch, mismatch);
