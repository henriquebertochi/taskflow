import { pool } from "../../db/pool.js";
import { AppError } from "../../lib/errors.js";

const invalidInvite = () => new AppError(404, "INVALID_INVITE", "Convite inválido ou expirado");

async function findGroupByCode(code: string) {
  const { rows } = await pool.query(
    `SELECT g.id, g.name,
            (SELECT count(*)::int FROM group_members m WHERE m.group_id = g.id) AS member_count
       FROM groups g WHERE g.invite_code = $1`,
    [code],
  );
  if (!rows[0]) throw invalidInvite();
  return { id: rows[0].id as number, name: rows[0].name as string, memberCount: rows[0].member_count as number };
}

// Dados mínimos do convite, para a tela /convite/:código (inclusive antes do login).
export async function getInvite(code: string) {
  return { group: await findGroupByCode(code) };
}

// Entra no grupo. Quem já é integrante não é adicionado de novo (joined = false).
export async function joinByInvite(code: string, userId: number) {
  const group = await findGroupByCode(code);
  const { rowCount } = await pool.query(
    `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')
     ON CONFLICT (group_id, user_id) DO NOTHING`,
    [group.id, userId],
  );
  return { group: { id: group.id, name: group.name }, joined: rowCount === 1 };
}
