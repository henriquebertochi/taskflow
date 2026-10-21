import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { app } from "../src/app.js";
import { pool } from "../src/db/pool.js";
import { sendMail } from "../src/lib/mailer.js";

vi.mock("../src/lib/mailer.js", () => ({ sendMail: vi.fn() }));

const validUser = {
  name: "Maria Silva",
  email: "maria@example.com",
  password: "senha-forte-123",
  passwordConfirmation: "senha-forte-123",
};

async function registerAndLogin() {
  await request(app).post("/api/auth/register").send(validUser).expect(201);
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: validUser.email, password: validUser.password })
    .expect(200);
  return res.body.token as string;
}

async function requestResetToken(email = validUser.email) {
  vi.mocked(sendMail).mockClear();
  await request(app).post("/api/auth/forgot-password").send({ email }).expect(200);
  const body = vi.mocked(sendMail).mock.calls[0]?.[2];
  return body?.match(/token=([\w-]+)/)?.[1];
}

describe("POST /api/auth/register", () => {
  it("cria a conta e não retorna a senha", async () => {
    const res = await request(app).post("/api/auth/register").send(validUser).expect(201);
    expect(res.body.message).toBe("Conta criada com sucesso");
    expect(res.body.user).toMatchObject({ id: 1, name: "Maria Silva", email: "maria@example.com" });
    expect(JSON.stringify(res.body)).not.toContain("senha-forte-123");

    const { rows } = await pool.query("SELECT password_hash FROM users");
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  });

  it("recusa e-mail já cadastrado, ignorando maiúsculas", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, email: "MARIA@example.com" })
      .expect(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
    expect(res.body.error.fields.email).toBeDefined();
  });

  it("indica quais campos estão vazios ou inválidos", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "", email: "nao-e-email", password: "123", passwordConfirmation: "123" })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(res.body.error.fields).sort()).toEqual(["email", "name", "password"]);
  });

  it("exige que senha e confirmação sejam iguais", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, passwordConfirmation: "outra-senha-123" })
      .expect(400);
    expect(res.body.error.fields).toEqual({ passwordConfirmation: "As senhas não coincidem" });
  });
});

describe("POST /api/auth/login", () => {
  it("retorna token com credenciais corretas", async () => {
    const token = await registerAndLogin();
    expect(token).toBeTypeOf("string");
  });

  it("usa a mesma mensagem para e-mail ou senha errados", async () => {
    await request(app).post("/api/auth/register").send(validUser).expect(201);
    const wrongPass = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: "errada-123" })
      .expect(401);
    const wrongEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "outro@example.com", password: validUser.password })
      .expect(401);
    expect(wrongPass.body).toEqual(wrongEmail.body);
    expect(wrongPass.body.error.message).toBe("E-mail ou senha inválidos");
  });
});

describe("rotas protegidas e logout", () => {
  it("bloqueia acesso sem token", async () => {
    const res = await request(app).get("/api/auth/me").expect(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("libera acesso com token e encerra a sessão no logout", async () => {
    const token = await registerAndLogin();
    const auth = { Authorization: `Bearer ${token}` };

    const me = await request(app).get("/api/auth/me").set(auth).expect(200);
    expect(me.body.user.email).toBe(validUser.email);

    await request(app).post("/api/auth/logout").set(auth).expect(204);
    await request(app).get("/api/auth/me").set(auth).expect(401);
  });
});

describe("recuperação de senha", () => {
  it("responde igual para e-mail não cadastrado, sem enviar e-mail", async () => {
    const token = await requestResetToken("ninguem@example.com");
    expect(token).toBeUndefined();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("redefine a senha com link válido e encerra sessões antigas", async () => {
    const oldSession = await registerAndLogin();
    const token = await requestResetToken();
    expect(token).toBeDefined();

    await request(app).get(`/api/auth/reset-password/${token}`).expect(200);
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "nova-senha-456", passwordConfirmation: "nova-senha-456" })
      .expect(200);

    await request(app).get("/api/auth/me").set({ Authorization: `Bearer ${oldSession}` }).expect(401);
    await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: "nova-senha-456" })
      .expect(200);
  });

  it("não aceita o mesmo link duas vezes", async () => {
    await registerAndLogin();
    const token = await requestResetToken();
    const body = { token, password: "nova-senha-456", passwordConfirmation: "nova-senha-456" };

    await request(app).post("/api/auth/reset-password").send(body).expect(200);
    const res = await request(app).post("/api/auth/reset-password").send(body).expect(400);
    expect(res.body.error.code).toBe("INVALID_RESET_TOKEN");
  });

  it("não aceita link expirado", async () => {
    await registerAndLogin();
    const token = await requestResetToken();
    await pool.query("UPDATE password_reset_tokens SET expires_at = now() - interval '1 minute'");

    await request(app).get(`/api/auth/reset-password/${token}`).expect(400);
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "nova-senha-456", passwordConfirmation: "nova-senha-456" })
      .expect(400);
  });
});
