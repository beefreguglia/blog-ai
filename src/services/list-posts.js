import { pool } from "../db/pool.js";

// Por padrão, apenas posts aprovados e já publicados (published_at na data atual ou anterior).
// Com includeAll, retorna todos os posts, inclusive pendentes e rejeitados.
export async function listPosts({ includeAll = false } = {}) {
  const where = includeAll ? "" : "WHERE approved_at IS NOT NULL AND published_at <= now()";

  const { rows } = await pool.query(
    `SELECT * FROM posts
     ${where}
     ORDER BY published_at DESC NULLS LAST, created_at DESC`,
  );

  return rows;
}
