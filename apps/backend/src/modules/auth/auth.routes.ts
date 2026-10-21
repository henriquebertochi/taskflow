import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schemas.js";
import * as auth from "./auth.service.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body ?? {});
  const user = await auth.register({ name, email, password });
  res.status(201).json({ message: "Conta criada com sucesso", user });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body ?? {});
  const session = await auth.login(email, password);
  res.json(session);
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  await auth.logout(req.sessionTokenHash!);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: await auth.getUser(req.user!.id) });
});

authRouter.post("/forgot-password", async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body ?? {});
  await auth.requestPasswordReset(email);
  res.json({
    message: "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha",
  });
});

// Permite ao frontend checar o link antes de mostrar o formulário de nova senha.
authRouter.get("/reset-password/:token", async (req, res) => {
  await auth.validateResetToken(req.params.token);
  res.json({ valid: true });
});

authRouter.post("/reset-password", async (req, res) => {
  const { token, password } = resetPasswordSchema.parse(req.body ?? {});
  await auth.resetPassword(token, password);
  res.json({ message: "Senha redefinida com sucesso, faça login com a nova senha" });
});
