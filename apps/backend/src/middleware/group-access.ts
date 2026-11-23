import type { RequestHandler } from "express";
import { pool } from "../db/pool.js";
import { AppError } from "../lib/errors.js";

export type GroupRole = "creator" | "member";

export interface GroupContext {
  id: number;
  name: string;
  description: string | null;
  inviteCode: string;
  createdAt: Date;
  role: GroupRole;
}

declare global {
  namespace Express {
    interface Request {
      group?: GroupContext;
    }
  }
}

export const groupNotFound = () => new AppError(404, "GROUP_NOT_FOUND", "Grupo não encontrado");

// Exige que o usuário logado seja integrante do grupo :id (RF05 / RNF05).
// Grupo inexistente e grupo de que o usuário não participa dão a mesma resposta,
// para não revelar quais grupos existem. Usar depois de requireAuth.
export const requireGroupMember: RequestHandler = async (req, _res, next) => {
  const raw = req.params.id;
  const groupId = typeof raw === "string" && /^\d{1,9}$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(groupId) || groupId <= 0) throw groupNotFound();

  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.description, g.invite_code, g.created_at, m.role
       FROM groups g
       JOIN group_members m ON m.group_id = g.id AND m.user_id = $2
      WHERE g.id = $1`,
    [groupId, req.user!.id],
  );
  const row = rows[0];
  if (!row) throw groupNotFound();

  req.group = {
    id: row.id,
    name: row.name,
    description: row.description,
    inviteCode: row.invite_code,
    createdAt: row.created_at,
    role: row.role,
  };
  next();
};

export const requireGroupCreator: RequestHandler = (req, _res, next) => {
  if (req.group?.role !== "creator") {
    throw new AppError(403, "FORBIDDEN", "Apenas quem criou o grupo pode fazer isso");
  }
  next();
};
