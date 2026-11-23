import request from "supertest";
import { app } from "../src/app.js";

// Cadastra e faz login, devolvendo um agente com o Bearer token já configurado.
export async function signUp(name: string, email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`) {
  const password = "senha-forte-123";
  await request(app)
    .post("/api/auth/register")
    .send({ name, email, password, passwordConfirmation: password })
    .expect(201);
  const res = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  const token = res.body.token as string;
  const auth = { Authorization: `Bearer ${token}` };
  return {
    id: res.body.user.id as number,
    name,
    token,
    get: (url: string) => request(app).get(url).set(auth),
    post: (url: string, body?: object) => request(app).post(url).set(auth).send(body),
    put: (url: string, body?: object) => request(app).put(url).set(auth).send(body),
    patch: (url: string, body?: object) => request(app).patch(url).set(auth).send(body),
    delete: (url: string) => request(app).delete(url).set(auth),
  };
}

export type TestUser = Awaited<ReturnType<typeof signUp>>;

export async function createGroup(user: TestUser, name = "Trabalho de PDS II") {
  const res = await user.post("/api/groups", { name }).expect(201);
  return res.body.group as { id: number; name: string; inviteCode: string };
}
