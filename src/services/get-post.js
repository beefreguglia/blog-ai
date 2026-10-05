import { pool } from "../db/pool.js";

export async function getPost(id) {
  const { rows } = await pool.query("SELECT * FROM posts WHERE id = $1", [id]);

  return rows[0] ?? null;
}
