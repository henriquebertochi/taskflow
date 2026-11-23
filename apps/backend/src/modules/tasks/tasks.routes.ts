import { Router, type Request } from "express";
import { taskInputSchema } from "./tasks.schemas.js";
import * as tasks from "./tasks.service.js";

// Montado em /groups/:id/tasks, depois de requireAuth e requireGroupMember.
export const tasksRouter = Router({ mergeParams: true });

function taskId(req: Request) {
  const raw = String(req.params.taskId);
  if (!/^\d{1,9}$/.test(raw) || Number(raw) <= 0) throw tasks.taskNotFound();
  return Number(raw);
}

tasksRouter.get("/", async (req, res) => {
  res.json({ tasks: await tasks.listTasks(req.group!.id) });
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
