import { nanoid } from "nanoid";
import { generatePostFromIdea } from "../agents/post-writer.js";
import { pool } from "../db/pool.js";

export async function createPostDraft(idea) {
  const { title, content } = await generatePostFromIdea(idea);

  const { rows } = await pool.query(
    `INSERT INTO posts (id, title, content, published_at, approved_at, rejected_at, created_at)
     VALUES ($1, $2, $3, NULL, NULL, NULL, now())
     RETURNING *`,
    [nanoid(), title, content],
  );

  return rows[0];
}
