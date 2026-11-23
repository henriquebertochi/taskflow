import { Router, type Request } from "express";
import { statusSchema, taskInputSchema } from "./tasks.schemas.js";
import * as tasks from "./tasks.service.js";

// Montado em /groups/:id/tasks, depois de requireAuth e requireGroupMember.
export const tasksRouter = Router({ mergeParams: true });

function taskId(req: Request) {
  const raw = String(req.params.taskId);
  if (!/^\d{1,9}$/.test(raw) || Number(raw) <= 0) throw tasks.taskNotFound();
  return Number(raw);
}

// Tarefas e resumo do progresso (RF08).
tasksRouter.get("/", async (req, res) => {
  const list = await tasks.listTasks(req.group!.id);
  res.json({ tasks: list, summary: tasks.summarize(list) });
});

tasksRouter.post("/", async (req, res) => {
  const input = taskInputSchema.parse(req.body ?? {});
  res.status(201).json({ task: await tasks.createTask(req.group!.id, req.user!.id, input) });
});

tasksRouter.put("/:taskId", async (req, res) => {
  const id = taskId(req);
  const input = taskInputSchema.parse(req.body ?? {});
  res.json({ task: await tasks.updateTask(req.group!.id, id, input) });
});

tasksRouter.delete("/:taskId", async (req, res) => {
  await tasks.deleteTask(req.group!.id, taskId(req));
  res.status(204).end();
});

tasksRouter.patch("/:taskId/status", async (req, res) => {
  const id = taskId(req);
  const { status } = statusSchema.parse(req.body ?? {});
  res.json({ task: await tasks.updateStatus(req.group!.id, id, status) });
});
