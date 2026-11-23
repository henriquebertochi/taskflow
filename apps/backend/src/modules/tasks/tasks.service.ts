import { config } from "../../config.js";
import { pool } from "../../db/pool.js";
import { AppError } from "../../lib/errors.js";
import type { TaskInput } from "./tasks.schemas.js";

export type TaskStatus = "todo" | "in_progress" | "done";

export const taskNotFound = () => new AppError(404, "TASK_NOT_FOUND", "Tarefa não encontrada");

const fieldError = (field: string, message: string) =>
  new AppError(400, "VALIDATION_ERROR", "Verifique os campos informados", { [field]: message });

// Colunas comuns a todas as consultas de tarefa; $1 é sempre o fuso (para "hoje").
const TASK_COLUMNS = `
  t.id, t.group_id, t.title, t.description, t.status, t.due_date, t.created_at, t.updated_at,
  t.assignee_id, u.name AS assignee_name,
  (t.status <> 'done' AND t.due_date < (now() AT TIME ZONE $1)::date) AS overdue`;

function toTask(r: any) {
  return {
    id: r.id as number,
    groupId: r.group_id as number,
    title: r.title as string,
    description: r.description as string | null,
    status: r.status as TaskStatus,
    dueDate: r.due_date as string,
    assignee: r.assignee_id ? { id: r.assignee_id as number, name: r.assignee_name as string } : null,
    overdue: r.overdue as boolean,
    createdAt: r.created_at as Date,
    updatedAt: r.updated_at as Date,
  };
}

export type Task = ReturnType<typeof toTask>;

async function today(): Promise<string> {
  const { rows } = await pool.query("SELECT (now() AT TIME ZONE $1)::date AS today", [config.timezone]);
  return rows[0].today;
}

// O responsável precisa ser integrante do grupo (RF07).
async function assertAssigneeIsMember(groupId: number, assigneeId: number | null) {
  if (assigneeId === null) return;
  const { rowCount } = await pool.query("SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2", [
    groupId,
    assigneeId,
  ]);
  if (!rowCount) throw fieldError("assigneeId", "O responsável deve ser integrante do grupo");
}

export async function getTask(groupId: number, taskId: number) {
  const { rows } = await pool.query(
    `SELECT ${TASK_COLUMNS} FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.id = $2 AND t.group_id = $3`,
    [config.timezone, taskId, groupId],
  );
  if (!rows[0]) throw taskNotFound();
  return toTask(rows[0]);
}

export async function listTasks(groupId: number) {
  const { rows } = await pool.query(
    `SELECT ${TASK_COLUMNS} FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.group_id = $2
      ORDER BY t.due_date, t.id`,
    [config.timezone, groupId],
  );
  return rows.map(toTask);
}

export async function createTask(groupId: number, userId: number, input: TaskInput) {
  // Ao criar, o prazo não pode ser uma data passada.
  if (input.dueDate < (await today())) {
    throw fieldError("dueDate", "O prazo não pode ser uma data passada");
  }
  await assertAssigneeIsMember(groupId, input.assigneeId);

  // Toda tarefa nova começa como "A fazer" (default da coluna).
  const { rows } = await pool.query(
    `INSERT INTO tasks (group_id, title, description, assignee_id, due_date, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [groupId, input.title, input.description, input.assigneeId, input.dueDate, userId],
  );
  return getTask(groupId, rows[0].id);
}

export async function updateTask(groupId: number, taskId: number, input: TaskInput) {
  const current = await getTask(groupId, taskId);
  // Na edição, um prazo já vencido pode ser mantido, mas não trocado por outra data passada.
  if (input.dueDate !== current.dueDate && input.dueDate < (await today())) {
    throw fieldError("dueDate", "O prazo não pode ser uma data passada");
  }
  await assertAssigneeIsMember(groupId, input.assigneeId);

  await pool.query(
    `UPDATE tasks SET title = $1, description = $2, assignee_id = $3, due_date = $4, updated_at = now()
      WHERE id = $5 AND group_id = $6`,
    [input.title, input.description, input.assigneeId, input.dueDate, taskId, groupId],
  );
  return getTask(groupId, taskId);
}

export async function deleteTask(groupId: number, taskId: number) {
  const { rowCount } = await pool.query("DELETE FROM tasks WHERE id = $1 AND group_id = $2", [taskId, groupId]);
  if (!rowCount) throw taskNotFound();
}
