import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireGroupMember } from "../../middleware/group-access.js";
import { createGroupSchema } from "./groups.schemas.js";
import * as groups from "./groups.service.js";

export const groupsRouter = Router();

groupsRouter.use(requireAuth);
// Toda rota /groups/:id/... passa pela verificação de integrante (RNF05).
groupsRouter.use("/:id", requireGroupMember);

groupsRouter.post("/", async (req, res) => {
  const input = createGroupSchema.parse(req.body ?? {});
  res.status(201).json({ group: await groups.createGroup(req.user!.id, input) });
});

groupsRouter.get("/", async (req, res) => {
  res.json({ groups: await groups.listGroups(req.user!.id) });
});

groupsRouter.get("/:id", async (req, res) => {
  res.json({ group: groups.publicGroup(req.group!) });
});
