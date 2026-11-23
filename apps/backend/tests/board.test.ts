import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "../src/db/pool.js";
import { createGroup, day, signUp, type TestUser } from "./helpers.js";

let ana: TestUser;
let bruno: TestUser;
let tasksUrl: string;

async function addTask(title: string, dueDate = day(5)) {
  const res = await ana.post(tasksUrl, { title, dueDate }).expect(201);
  return res.body.task.id as number;
}

beforeEach(async () => {
  ana = await signUp("Ana");
  bruno = await signUp("Bruno");
  const group = await createGroup(ana);
  await bruno.post(`/api/invites/${group.inviteCode}/join`).expect(200);
  tasksUrl = `/api/groups/${group.id}/tasks`;
});

describe("PATCH /api/groups/:id/tasks/:taskId/status (RF08)", () => {
  it("qualquer integrante muda o status e a mudança fica salva", async () => {
    const id = await addTask("Introdução");
    const res = await bruno.patch(`${tasksUrl}/${id}/status`, { status: "in_progress" }).expect(200);
    expect(res.body.task).toMatchObject({ id, status: "in_progress" });

    await bruno.patch(`${tasksUrl}/${id}/status`, { status: "done" }).expect(200);
    const list = await ana.get(tasksUrl).expect(200);
    expect(list.body.tasks[0].status).toBe("done");
  });

  it("recusa status inválido", async () => {
    const id = await addTask("Introdução");
    const res = await ana.patch(`${tasksUrl}/${id}/status`, { status: "feito" }).expect(400);
    expect(res.body.error).toMatchObject({ code: "VALIDATION_ERROR", fields: { status: "Status inválido" } });
    await ana.patch(`${tasksUrl}/${id}/status`, {}).expect(400);
  });

  it("tarefa inexistente ou de quem está fora do grupo", async () => {
    const id = await addTask("Introdução");
    await ana.patch(`${tasksUrl}/999/status`, { status: "done" }).expect(404);
    const carla = await signUp("Carla");
    const res = await carla.patch(`${tasksUrl}/${id}/status`, { status: "done" }).expect(404);
    expect(res.body.error.code).toBe("GROUP_NOT_FOUND");
  });
});

describe("GET /api/groups/:id/tasks — progresso (RF08)", () => {
  it("quadro vazio tem resumo zerado", async () => {
    const res = await ana.get(tasksUrl).expect(200);
    expect(res.body).toEqual({ tasks: [], summary: { total: 0, done: 0, overdue: 0, percentDone: 0 } });
  });

  it("calcula a % concluída e marca as atrasadas (prazo vencido e não concluída)", async () => {
    const late = await addTask("Atrasada");
    const lateButDone = await addTask("Vencida mas concluída");
    const done = await addTask("Concluída");
    await addTask("Vence hoje", day(0));
    await pool.query("UPDATE tasks SET due_date = $1 WHERE id = ANY($2)", [day(-2), [late, lateButDone]]);
    await ana.patch(`${tasksUrl}/${lateButDone}/status`, { status: "done" }).expect(200);
    await ana.patch(`${tasksUrl}/${done}/status`, { status: "done" }).expect(200);

    const res = await bruno.get(tasksUrl).expect(200);
    expect(res.body.summary).toEqual({ total: 4, done: 2, overdue: 1, percentDone: 50 });
    const overdue = Object.fromEntries(res.body.tasks.map((t: { title: string; overdue: boolean }) => [t.title, t.overdue]));
    expect(overdue).toEqual({
      Atrasada: true,
      "Vencida mas concluída": false,
      Concluída: false,
      "Vence hoje": false,
    });
  });

  it("arredonda a porcentagem", async () => {
    const a = await addTask("A");
    await addTask("B");
    await addTask("C");
    await ana.patch(`${tasksUrl}/${a}/status`, { status: "done" }).expect(200);
    expect((await ana.get(tasksUrl)).body.summary.percentDone).toBe(33);
  });
});
