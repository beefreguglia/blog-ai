import { pool } from "../db/pool.js";

// Aprova apenas posts ainda pendentes (não aprovados e não rejeitados).
// Retorna null quando nenhum post foi atualizado.
export async function approvePost(id) {
  const { rows } = await pool.query(
    `UPDATE posts
     SET approved_at = now()
     WHERE id = $1 AND approved_at IS NULL AND rejected_at IS NULL
     RETURNING *`,
    [id],
  );

  return rows[0] ?? null;
}
