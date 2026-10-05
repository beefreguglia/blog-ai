import { pool } from "../db/pool.js";

// Aprova apenas posts ainda pendentes (não aprovados e não rejeitados).
// published_at é opcional e assume a data atual.
// Retorna null quando nenhum post foi atualizado.
export async function approvePost(id, publishedAt = null) {
  const { rows } = await pool.query(
    `UPDATE posts
     SET approved_at = now(), published_at = COALESCE($2, now())
     WHERE id = $1 AND approved_at IS NULL AND rejected_at IS NULL
     RETURNING *`,
    [id, publishedAt],
  );

  return rows[0] ?? null;
}
