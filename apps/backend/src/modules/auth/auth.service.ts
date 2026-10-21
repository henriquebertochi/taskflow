import bcrypt from "bcryptjs";
import { config } from "../../config.js";
import { pool } from "../../db/pool.js";
import { AppError } from "../../lib/errors.js";
import { sendMail } from "../../lib/mailer.js";
import { generateToken, hashToken } from "../../lib/tokens.js";

const BCRYPT_ROUNDS = 10;
// Usado quando o e-mail não existe, para o login levar o mesmo tempo
// e não revelar quais e-mails estão cadastrados.
const DUMMY_HASH = bcrypt.hashSync("dummy-password", BCRYPT_ROUNDS);

const invalidResetLink = () =>
  new AppError(400, "INVALID_RESET_TOKEN", "Link de redefinição inválido, expirado ou já utilizado");

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

const publicUser = (u: Pick<UserRow, "id" | "name" | "email" | "created_at">) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  createdAt: u.created_at,
});

export async function register(input: { name: string; email: string; password: string }) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [input.name, input.email, passwordHash],
    );
    return publicUser(rows[0]);
  } catch (err: any) {
    if (err?.code === "23505") {
      throw new AppError(409, "EMAIL_TAKEN", "Este e-mail já está cadastrado", {
        email: "Este e-mail já está cadastrado",
      });
    }
    throw err;
  }
}

export async function login(email: string, password: string) {
  const { rows } = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    throw new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha inválidos");
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + config.sessionTtlHours * 3600_000);
  await pool.query("DELETE FROM sessions WHERE user_id = $1 AND expires_at <= now()", [user.id]);
  await pool.query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
    user.id,
    hashToken(token),
    expiresAt,
  ]);
  return { token, expiresAt, user: publicUser(user) };
}

export async function logout(tokenHash: string) {
  await pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
}

export async function getUser(id: number) {
  const { rows } = await pool.query<UserRow>(
    "SELECT id, name, email, created_at FROM users WHERE id = $1",
    [id],
  );
  return publicUser(rows[0]);
}

export async function requestPasswordReset(email: string) {
  const { rows } = await pool.query<UserRow>("SELECT id, name, email FROM users WHERE email = $1", [email]);
  const user = rows[0];
  // E-mail não cadastrado: não faz nada, mas a resposta é a mesma.
  if (!user) return;

  const token = generateToken();
  const expiresAt = new Date(Date.now() + config.resetTokenTtlMinutes * 60_000);
  // Um novo pedido invalida os links anteriores ainda não usados.
  await pool.query(
    "UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL",
    [user.id],
  );
  await pool.query(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [user.id, hashToken(token), expiresAt],
  );

  const link = `${config.appUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
  await sendMail(
    user.email,
    "TaskFlow - Redefinição de senha",
    `Olá, ${user.name}!\n\n` +
      `Recebemos um pedido para redefinir sua senha. Acesse o link abaixo para criar uma nova senha:\n\n` +
      `${link}\n\n` +
      `O link expira em ${config.resetTokenTtlMinutes} minutos e só pode ser usado uma vez.\n` +
      `Se você não fez esse pedido, ignore este e-mail.`,
  );
}

export async function validateResetToken(token: string) {
  const { rows } = await pool.query(
    `SELECT 1 FROM password_reset_tokens
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [hashToken(token)],
  );
  if (!rows[0]) throw invalidResetLink();
}

export async function resetPassword(token: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Marca como usado de forma atômica: dois envios simultâneos do mesmo
    // link não conseguem redefinir a senha duas vezes.
    const { rows } = await client.query<{ user_id: number }>(
      `UPDATE password_reset_tokens SET used_at = now()
        WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
        RETURNING user_id`,
      [hashToken(token)],
    );
    if (!rows[0]) throw invalidResetLink();

    const userId = rows[0].user_id;
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, userId]);
    // Encerra todas as sessões abertas com a senha antiga.
    await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
