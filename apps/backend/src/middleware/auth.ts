import type { RequestHandler } from "express";
import { pool } from "../db/pool.js";
import { AppError } from "../lib/errors.js";
import { hashToken } from "../lib/tokens.js";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionTokenHash?: string;
    }
  }
}

// Exige "Authorization: Bearer <token>" com uma sessão válida.
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) {
    throw new AppError(401, "UNAUTHENTICATED", "Faça login para continuar");
  }

  const tokenHash = hashToken(token);
  const { rows } = await pool.query<AuthUser>(
    `SELECT u.id, u.name, u.email
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash],
  );
  if (!rows[0]) {
    throw new AppError(401, "UNAUTHENTICATED", "Sessão expirada ou inválida, faça login novamente");
  }

  req.user = rows[0];
  req.sessionTokenHash = tokenHash;
  next();
};
