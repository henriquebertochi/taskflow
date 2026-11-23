import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "../src/db/pool.js";
import { createGroup, day, signUp, type TestUser } from "./helpers.js";

let ana: TestUser;
let bruno: TestUser;
let group: { id: number; inviteCode: string };
let tasksUrl: string;

beforeEach(async () => {
  ana = await signUp("Ana");
  bruno = await signUp("Bruno");
  group = await createGroup(ana);
  await bruno.post(`/api/invites/${group.inviteCode}/join`).expect(200);
  tasksUrl = `/api/groups/${group.id}/tasks`;
});

const newTask = (overrides: object = {}) => ({
  title: "Escrever a introdução",
  description: "Até 2 páginas",
  assigneeId: null,
  dueDate: day(7),
  ...overrides,
});

describe("POST /api/groups/:id/tasks (RF07)", () => {
  it("cria a tarefa como 'A fazer', com responsável e prazo", async () => {
    const res = await ana.post(tasksUrl, newTask({ assigneeId: bruno.id })).expect(201);
    expect(res.body.task).toMatchObject({
      id: 1,
      groupId: group.id,
      title: "Escrever a introdução",
      description: "Até 2 páginas",
      status: "todo",
      dueDate: day(7),
      assignee: { id: bruno.id, name: "Bruno" },
      overdue: false,
    });
  });

  it("aceita tarefa 'Sem responsável' e prazo para hoje", async () => {
    const res = await ana
      .post(tasksUrl, { title: "Revisar", dueDate: day(0) })
      .expect(201);
    expect(res.body.task).toMatchObject({ assignee: null, description: null, dueDate: day(0) });
  });

  it("a tarefa criada aparece para todos os integrantes", async () => {
    await ana.post(tasksUrl, newTask({ assigneeId: ana.id })).expect(201);
    const res = await bruno.get(tasksUrl).expect(200);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0]).toMatchObject({ title: "Escrever a introdução", assignee: { name: "Ana" } });
  });

  it("indica os campos obrigatórios vazios", async () => {
    const res = await ana.post(tasksUrl, { title: "  ", dueDate: "" }).expect(400);
    expect(res.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { title: "Informe o título", dueDate: "Informe o prazo" },
    });
  });

  it("recusa prazo inválido ou no passado", async () => {
    const invalid = await ana.post(tasksUrl, newTask({ dueDate: "2026-02-30" })).expect(400);
    expect(invalid.body.error.fields).toEqual({ dueDate: "Prazo inválido" });

    const past = await ana.post(tasksUrl, newTask({ dueDate: day(-1) })).expect(400);
    expect(past.body.error.fields).toEqual({ dueDate: "O prazo não pode ser uma data passada" });
  });

  it("recusa responsável que não é do grupo", async () => {
    const carla = await signUp("Carla");
    const res = await ana.post(tasksUrl, newTask({ assigneeId: carla.id })).expect(400);
    expect(res.body.error.fields).toEqual({ assigneeId: "O responsável deve ser integrante do grupo" });
  });

  it("quem não é integrante não cria nem vê tarefas", async () => {
    const carla = await signUp("Carla");
    expect((await carla.post(tasksUrl, newTask()).expect(404)).body.error.code).toBe("GROUP_NOT_FOUND");
    expect((await carla.get(tasksUrl).expect(404)).body.error.code).toBe("GROUP_NOT_FOUND");
  });
});

describe("PUT /api/groups/:id/tasks/:taskId (RF07)", () => {
  it("qualquer integrante edita a tarefa", async () => {
    const { body } = await ana.post(tasksUrl, newTask()).expect(201);
    const res = await bruno
      .put(`${tasksUrl}/${body.task.id}`, newTask({ title: "Introdução e objetivos", assigneeId: bruno.id, dueDate: day(3) }))
      .expect(200);
    expect(res.body.task).toMatchObject({
      title: "Introdução e objetivos",
      assignee: { id: bruno.id, name: "Bruno" },
      dueDate: day(3),
      status: "todo",
    });
    expect((await ana.get(tasksUrl)).body.tasks[0].title).toBe("Introdução e objetivos");
  });

  it("mantém um prazo já vencido, mas não aceita trocar por outra data passada", async () => {
    const { body } = await ana.post(tasksUrl, newTask()).expect(201);
    await pool.query("UPDATE tasks SET due_date = $1 WHERE id = $2", [day(-3), body.task.id]);

    await ana.put(`${tasksUrl}/${body.task.id}`, newTask({ title: "Novo título", dueDate: day(-3) })).expect(200);
    const res = await ana.put(`${tasksUrl}/${body.task.id}`, newTask({ dueDate: day(-1) })).expect(400);
    expect(res.body.error.fields).toEqual({ dueDate: "O prazo não pode ser uma data passada" });
  });

  it("valida os campos e o responsável", async () => {
    const { body } = await ana.post(tasksUrl, newTask()).expect(201);
    const carla = await signUp("Carla");
    const empty = await ana.put(`${tasksUrl}/${body.task.id}`, { title: "", dueDate: day(1) }).expect(400);
    expect(empty.body.error.fields).toEqual({ title: "Informe o título" });
    const outsider = await ana.put(`${tasksUrl}/${body.task.id}`, newTask({ assigneeId: carla.id })).expect(400);
    expect(outsider.body.error.fields.assigneeId).toBeDefined();
  });

  it("tarefa de outro grupo ou inexistente dá 'Tarefa não encontrada'", async () => {
    const other = await createGroup(bruno, "Outro grupo");
    const { body } = await bruno.post(`/api/groups/${other.id}/tasks`, newTask()).expect(201);
    const res = await ana.put(`${tasksUrl}/${body.task.id}`, newTask()).expect(404);
    expect(res.body.error).toEqual({ code: "TASK_NOT_FOUND", message: "Tarefa não encontrada" });
    await ana.put(`${tasksUrl}/abc`, newTask()).expect(404);
  });
});

describe("DELETE /api/groups/:id/tasks/:taskId (RF07)", () => {
  it("exclui a tarefa e ela some para todos", async () => {
    const { body } = await ana.post(tasksUrl, newTask()).expect(201);
    await bruno.delete(`${tasksUrl}/${body.task.id}`).expect(204);
    expect((await ana.get(tasksUrl)).body.tasks).toEqual([]);
    await bruno.delete(`${tasksUrl}/${body.task.id}`).expect(404);
  });

  it("quem não é integrante não exclui", async () => {
    const { body } = await ana.post(tasksUrl, newTask()).expect(201);
    const carla = await signUp("Carla");
    await carla.delete(`${tasksUrl}/${body.task.id}`).expect(404);
    expect((await ana.get(tasksUrl)).body.tasks).toHaveLength(1);
  });
});
