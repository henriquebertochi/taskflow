import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { createGroup, signUp } from "./helpers.js";

describe("GET /api/groups/:id/members (RF06)", () => {
  it("lista todos os integrantes pelo nome, criador primeiro", async () => {
    const ana = await signUp("Ana");
    const bruno = await signUp("Bruno");
    const group = await createGroup(ana);
    await bruno.post(`/api/invites/${group.inviteCode}/join`).expect(200);

    const res = await bruno.get(`/api/groups/${group.id}/members`).expect(200);
    expect(res.body.members).toMatchObject([
      { id: ana.id, name: "Ana", role: "creator" },
      { id: bruno.id, name: "Bruno", role: "member" },
    ]);
    expect(JSON.stringify(res.body)).not.toContain("@example.com");
  });

  it("não aparece para quem está fora do grupo", async () => {
    const ana = await signUp("Ana");
    const bruno = await signUp("Bruno");
    const group = await createGroup(ana);
    const res = await bruno.get(`/api/groups/${group.id}/members`).expect(404);
    expect(res.body.error.code).toBe("GROUP_NOT_FOUND");
  });
});

describe("convites (RF06)", () => {
  it("qualquer pessoa vê o nome do grupo pelo link, mesmo sem login", async () => {
    const ana = await signUp("Ana");
    const group = await createGroup(ana, "Trabalho de PDS II");
    const res = await request(app).get(`/api/invites/${group.inviteCode}`).expect(200);
    expect(res.body.group).toEqual({ id: group.id, name: "Trabalho de PDS II", memberCount: 1 });
  });

  it("link válido coloca o colega no grupo", async () => {
    const ana = await signUp("Ana");
    const bruno = await signUp("Bruno");
    const group = await createGroup(ana);

    const res = await bruno.post(`/api/invites/${group.inviteCode}/join`).expect(200);
    expect(res.body).toEqual({ group: { id: group.id, name: group.name }, joined: true });
    await bruno.get(`/api/groups/${group.id}`).expect(200);
    expect((await bruno.get("/api/groups")).body.groups).toHaveLength(1);
  });

  it("quem já é integrante não é adicionado de novo", async () => {
    const ana = await signUp("Ana");
    const group = await createGroup(ana);
    const res = await ana.post(`/api/invites/${group.inviteCode}/join`).expect(200);
    expect(res.body.joined).toBe(false);
    const members = await ana.get(`/api/groups/${group.id}/members`);
    expect(members.body.members).toHaveLength(1);
    expect(members.body.members[0].role).toBe("creator");
  });

  it("entrar exige login", async () => {
    const ana = await signUp("Ana");
    const group = await createGroup(ana);
    await request(app).post(`/api/invites/${group.inviteCode}/join`).expect(401);
  });

  it("link inválido responde 'Convite inválido ou expirado'", async () => {
    const bruno = await signUp("Bruno");
    const expected = { code: "INVALID_INVITE", message: "Convite inválido ou expirado" };
    expect((await request(app).get("/api/invites/nao-existe").expect(404)).body.error).toEqual(expected);
    expect((await bruno.post("/api/invites/nao-existe/join").expect(404)).body.error).toEqual(expected);
  });

  it("o criador gera um novo link e o anterior deixa de funcionar", async () => {
    const ana = await signUp("Ana");
    const bruno = await signUp("Bruno");
    const group = await createGroup(ana);

    const res = await ana.post(`/api/groups/${group.id}/invite`).expect(200);
    expect(res.body.inviteCode).not.toBe(group.inviteCode);
    expect((await ana.get(`/api/groups/${group.id}`)).body.group.inviteCode).toBe(res.body.inviteCode);

    await bruno.post(`/api/invites/${group.inviteCode}/join`).expect(404);
    await bruno.post(`/api/invites/${res.body.inviteCode}/join`).expect(200);
  });

  it("só o criador pode gerar um novo link", async () => {
    const ana = await signUp("Ana");
    const bruno = await signUp("Bruno");
    const group = await createGroup(ana);
    await bruno.post(`/api/invites/${group.inviteCode}/join`).expect(200);

    const res = await bruno.post(`/api/groups/${group.id}/invite`).expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
