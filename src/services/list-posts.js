import { pool } from '../db/pool.js';

export async function listPosts() {
  const { rows } = await pool.query('SELECT * FROM posts ORDER BY published_at DESC');

  return rows;
}
