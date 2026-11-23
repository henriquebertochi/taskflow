import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./lib/errors.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { groupsRouter } from "./modules/groups/groups.routes.js";
import { invitesRouter } from "./modules/invites/invites.routes.js";

export const app = express();

app.use(cors({ origin: config.corsOrigin }));

// Produção: o mesmo serviço entrega o frontend (arquivos com hash ficam em cache).
// apps/backend/{src,dist}/app → apps/frontend/dist
const frontendDist = config.serveFrontend
  ? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../frontend/dist")
  : null;
if (frontendDist) {
  app.use("/assets", express.static(path.join(frontendDist, "assets"), { immutable: true, maxAge: "1y" }));
  app.use(express.static(frontendDist, { index: false }));
}

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
app.use("/api/groups", groupsRouter);
app.use("/api/invites", invitesRouter);

// Rotas do React (ex.: /grupos/1, /convite/abc) devolvem o index.html; /api continua com 404 em JSON.
if (frontendDist) {
  app.get(/^\/(?!api(\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
