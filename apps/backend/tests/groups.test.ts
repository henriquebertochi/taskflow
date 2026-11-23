import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { pool } from "../src/db/pool.js";
import { createGroup, signUp } from "./helpers.js";

describe("POST /api/groups (RF05)", () => {
  it("cria o grupo com quem criou como criador", async () => {
    const ana = await signUp("Ana");
    const res = await ana
      .post("/api/groups", { name: "  Trabalho de PDS II ", description: "Entrega final" })
      .expect(201);
    expect(res.body.group).toMatchObject({
      id: 1,
      name: "Trabalho de PDS II",
      description: "Entrega final",
      role: "creator",
    });
    expect(res.body.group.inviteCode).toMatch(/^[\w-]{16}$/);

    const { rows } = await pool.query("SELECT user_id, role FROM group_members WHERE group_id = 1");
    expect(rows).toEqual([{ user_id: ana.id, role: "creator" }]);
  });

  it("descrição é opcional", async () => {
    const ana = await signUp("Ana");
    const res = await ana.post("/api/groups", { name: "Grupo", description: "   " }).expect(201);
    expect(res.body.group.description).toBeNull();
  });

  it("indica o erro no campo nome vazio ou longo demais", async () => {
    const ana = await signUp("Ana");
    const empty = await ana.post("/api/groups", { name: "   " }).expect(400);
    expect(empty.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { name: "Informe o nome do grupo" },
    });

    const long = await ana.post("/api/groups", { name: "x".repeat(61) }).expect(400);
    expect(long.body.error.fields).toEqual({ name: "O nome deve ter no máximo 60 caracteres" });

    await ana.post("/api/groups", { name: "x".repeat(60) }).expect(201);
  });

  it("exige login", async () => {
    const res = await request(app).post("/api/groups").send({ name: "Grupo" }).expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("GET /api/groups (RF05)", () => {
  it("lista só os grupos de que o usuário participa", async () => {
    const ana = await signUp("Ana");
    const bruno = await signUp("Bruno");
    await createGroup(ana, "Grupo A1");
    await createGroup(bruno, "Grupo B1");
    await createGroup(ana, "Grupo A2");

    const res = await ana.get("/api/groups").expect(200);
    expect(res.body.groups.map((g: { name: string }) => g.name)).toEqual(["Grupo A2", "Grupo A1"]);
    expect(res.body.groups[0]).toMatchObject({ role: "creator", memberCount: 1 });
  });

  it("usuário sem grupos recebe lista vazia", async () => {
    const ana = await signUp("Ana");
    const res = await ana.get("/api/groups").expect(200);
    expect(res.body.groups).toEqual([]);
  });
});

describe("GET /api/groups/:id (RF05)", () => {
  it("integrante vê o grupo", async () => {
    const ana = await signUp("Ana");
    const group = await createGroup(ana);
    const res = await ana.get(`/api/groups/${group.id}`).expect(200);
    expect(res.body.group).toMatchObject({ id: group.id, name: group.name, role: "creator" });
  });

  it("quem não é integrante recebe 'Grupo não encontrado'", async () => {
    const ana = await signUp("Ana");
    const bruno = await signUp("Bruno");
    const group = await createGroup(ana);
    const res = await bruno.get(`/api/groups/${group.id}`).expect(404);
    expect(res.body.error).toEqual({ code: "GROUP_NOT_FOUND", message: "Grupo não encontrado" });
  });

  it("id inexistente ou inválido dá a mesma resposta", async () => {
    const ana = await signUp("Ana");
    expect((await ana.get("/api/groups/999").expect(404)).body.error.code).toBe("GROUP_NOT_FOUND");
    expect((await ana.get("/api/groups/abc").expect(404)).body.error.code).toBe("GROUP_NOT_FOUND");
  });
});
