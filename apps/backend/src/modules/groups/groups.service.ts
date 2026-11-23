import { pool } from "../../db/pool.js";
import type { GroupContext } from "../../middleware/group-access.js";
import { generateInviteCode } from "../../lib/tokens.js";

export function publicGroup(g: GroupContext) {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    inviteCode: g.inviteCode,
    role: g.role,
    createdAt: g.createdAt,
  };
}

export async function createGroup(userId: number, input: { name: string; description: string | null }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO groups (name, description, invite_code, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, invite_code, created_at`,
      [input.name, input.description, generateInviteCode(), userId],
    );
    const g = rows[0];
    // Quem cria entra automaticamente como criador.
    await client.query("INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'creator')", [
      g.id,
      userId,
    ]);
    await client.query("COMMIT");
    return publicGroup({
      id: g.id,
      name: g.name,
      description: g.description,
      inviteCode: g.invite_code,
      createdAt: g.created_at,
      role: "creator",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Só os grupos de que o usuário é integrante, mais recentes primeiro.
export async function listGroups(userId: number) {
  const { rows } = await pool.query(
    `SELECT g.id, g.name, g.description, g.created_at, m.role,
            (SELECT count(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS member_count
       FROM groups g
       JOIN group_members m ON m.group_id = g.id AND m.user_id = $1
      ORDER BY g.created_at DESC, g.id DESC`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    role: r.role,
    memberCount: r.member_count,
    createdAt: r.created_at,
  }));
}
