import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./lib/errors.js";
import { authRouter } from "./modules/auth/auth.routes.js";

export const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
// Respostas da API nunca devem ficar em cache (ex.: dados do usuário após logout).
app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
// Rotas internas (grupos, tarefas...) dos próximos sprints entram aqui,
// protegidas com requireAuth.

app.use(notFoundHandler);
app.use(errorHandler);
