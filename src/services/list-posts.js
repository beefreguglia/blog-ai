import { pool } from "../db/pool.js";

// Apenas posts aprovados e já publicados (published_at na data atual ou anterior).
export async function listPosts() {
  const { rows } = await pool.query(
    `SELECT * FROM posts
     WHERE approved_at IS NOT NULL AND published_at <= now()
     ORDER BY published_at DESC`,
  );

  return rows;
}
