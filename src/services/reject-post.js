import { pool } from "../db/pool.js";

// Rejeita apenas posts ainda pendentes (não aprovados e não rejeitados).
// rejected_at e published_at assumem a data e hora atuais.
// Retorna null quando nenhum post foi atualizado.
export async function rejectPost(id) {
  const { rows } = await pool.query(
    `UPDATE posts
     SET rejected_at = now(), published_at = now()
     WHERE id = $1 AND approved_at IS NULL AND rejected_at IS NULL
     RETURNING *`,
    [id],
  );

  return rows[0] ?? null;
}
