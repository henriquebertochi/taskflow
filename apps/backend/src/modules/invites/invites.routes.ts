import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import * as invites from "./invites.service.js";

export const invitesRouter = Router();

// Público: quem abre o link sem estar logado vê o nome do grupo antes de entrar ou se cadastrar.
invitesRouter.get("/:code", async (req, res) => {
  res.json(await invites.getInvite(String(req.params.code)));
});

invitesRouter.post("/:code/join", requireAuth, async (req, res) => {
  res.json(await invites.joinByInvite(String(req.params.code), req.user!.id));
});
